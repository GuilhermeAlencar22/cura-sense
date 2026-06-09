"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import type { CuraLote } from "@/types";
import { listarCuras } from "@/services/curasService";
import { buscarLote, listarLotes } from "@/services/lotesService";
import { buscarReceita, listarReceitas } from "@/services/receitasService";
import { avaliarLeitura } from "@/utils/calcularConformidadeTelemetria";
import { calcularDiasRestantes, calcularProgresso, labelTipoPeca } from "@/utils/formatters";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [curas, setCuras] = useState<CuraLote[]>([]);
  const [totalLotes, setTotalLotes] = useState(0);
  const [totalReceitas, setTotalReceitas] = useState(0);

  useEffect(() => {
    setCuras(listarCuras());
    setTotalLotes(listarLotes().length);
    setTotalReceitas(listarReceitas().length);
  }, []);

  const ativas     = curas.filter((c) => c.status === "em_cura");
  const concluidas = curas.filter((c) => c.status === "concluida");

  const curasComAlerta = ativas.filter((c) => {
    if (c.temperaturaAtual === null || c.umidadeAtual === null) return false;
    const conf = avaliarLeitura(c.temperaturaAtual, c.umidadeAtual, c.parametros);
    return conf.geral !== "conforme";
  });

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral de lotes, curas e receitas.</p>
        </div>
        <Link href="/producao/nova" className="btn btn-primary">
          + Novo Lote
        </Link>
      </div>

      {/* ── Alertas críticos no topo ── */}
      {curasComAlerta.length > 0 && (
        <div className={styles.alertasCriticos}>
          <div className={styles.alertasCriticosHeader}>
            <span className={styles.alertaIcone}>⚠</span>
            <strong>{curasComAlerta.length} cura{curasComAlerta.length > 1 ? "s precisam" : " precisa"} de atenção agora</strong>
          </div>
          {curasComAlerta.map((cura) => {
            const lote = buscarLote(cura.loteId);
            const conf = avaliarLeitura(cura.temperaturaAtual ?? 0, cura.umidadeAtual ?? 0, cura.parametros);
            const umidBaixa = cura.umidadeAtual !== null && cura.umidadeAtual < cura.parametros.umidadeIdealMin;
            const mlPorAcionamento = cura.parametros.regraIrrigacao.mlPorAcionamento;
            const mlNecessarios = umidBaixa
              ? Math.max(mlPorAcionamento, Math.ceil((cura.parametros.umidadeIdealMin - (cura.umidadeAtual ?? 0)) * 2))
              : 0;
            const clicks = umidBaixa ? Math.ceil(mlNecessarios / mlPorAcionamento) : 0;

            return (
              <div key={cura.id} className={`${styles.alertaItem} ${conf.geral === "desvio_critico" ? styles.alertaItemCritico : styles.alertaItemLeve}`}>
                <div className={styles.alertaItemInfo}>
                  <span className={styles.alertaItemNome}>{lote?.nomeIdentificacao ?? cura.loteId}</span>
                  <div className={styles.alertaItemDetalhes}>
                    {conf.temperatura !== "conforme" && (
                      <span>🌡 {cura.temperaturaAtual}°C — ideal: {cura.parametros.temperaturaIdealMin}–{cura.parametros.temperaturaIdealMax}°C</span>
                    )}
                    {conf.umidade !== "conforme" && (
                      <span>💧 {cura.umidadeAtual}% — ideal: ≥{cura.parametros.umidadeIdealMin}%</span>
                    )}
                  </div>
                  {umidBaixa && clicks > 0 && (
                    <div className={styles.alertaClicks}>
                      Pressione o botão físico da bomba <strong>{clicks}×</strong> para adicionar ~{mlNecessarios} ml e normalizar a umidade.
                    </div>
                  )}
                </div>
                <Link href={`/curas/${cura.id}`} className="btn btn-danger btn-sm">
                  Ver cura →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cards de resumo ── */}
      <div className="cards-grid">
        <StatCard label="Em cura"        value={ativas.length}         icon="⟳" variant="blue"  />
        <StatCard label="Com alerta"     value={curasComAlerta.length} icon="⚠" variant="red"   />
        <StatCard label="Concluídas"     value={concluidas.length}     icon="✓" variant="green" />
        <StatCard label="Total de lotes" value={totalLotes}            icon="⊞" />
        <StatCard label="Receitas"       value={totalReceitas}         icon="✦" variant="blue"  />
      </div>

      {/* ── Tabela de curas ativas ── */}
      <h2 className="section-title">Curas ativas</h2>
      <div className="table-container">
        {ativas.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2.5rem" }}>⟳</span>
            <p>Nenhuma cura ativa no momento.</p>
            <Link href="/producao/nova" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
              Registrar primeiro lote
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Receita</th>
                <th>Câmara</th>
                <th>Status</th>
                <th>Situação</th>
                <th>Progresso</th>
                <th>Dias restantes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ativas.map((cura) => {
                const receita = buscarReceita(cura.receitaId);
                const progresso = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;
                const diasRestantes = calcularDiasRestantes(cura.previsaoFim);
                const temLeitura = cura.temperaturaAtual !== null && cura.umidadeAtual !== null;
                const conformidade = temLeitura
                  ? avaliarLeitura(cura.temperaturaAtual ?? 0, cura.umidadeAtual ?? 0, cura.parametros)
                  : null;
                const comAlerta = conformidade && conformidade.geral !== "conforme";

                return (
                  <tr key={cura.id} className={comAlerta ? styles.rowAlerta : ""}>
                    <td>
                      <div className={styles.loteCell}>
                        {comAlerta && <span className={styles.alertaDot} title="Atenção necessária">●</span>}
                        <span style={{ fontWeight: 500 }}>{cura.loteId}</span>
                      </div>
                    </td>
                    <td>{receita ? `${receita.nome} · ${labelTipoPeca(receita.tipoPeca)}` : "—"}</td>
                    <td>
                      {temLeitura ? (
                        <span className={comAlerta ? styles.leituraAlerta : styles.leituraNormal}>
                          {cura.temperaturaAtual}°C · {cura.umidadeAtual}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>Sem dados</span>
                      )}
                    </td>
                    <td><StatusBadge status={cura.status} /></td>
                    <td>
                      {!conformidade ? (
                        <span className={styles.tagSemDados}>Aguardando sensor</span>
                      ) : conformidade.geral === "conforme" ? (
                        <span className={styles.tagConforme}>✓ Normal</span>
                      ) : conformidade.geral === "desvio_leve" ? (
                        <span className={styles.tagDesvioLeve}>⚠ Desvio leve</span>
                      ) : (
                        <span className={styles.tagDesvioCritico}>✕ Crítico</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.progressMini}>
                        <div className={styles.progressBarMini}>
                          <div className={styles.progressFillMini} style={{ width: `${progresso}%` }} />
                        </div>
                        <span>{progresso}%</span>
                      </div>
                    </td>
                    <td>{diasRestantes} dia{diasRestantes !== 1 ? "s" : ""}</td>
                    <td>
                      <Link href={`/curas/${cura.id}`} className={`btn btn-sm ${comAlerta ? "btn-danger" : "btn-secondary"}`}>
                        {comAlerta ? "Atender →" : "Ver"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
