"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { buscarCura, atualizarCura, registrarLeitura } from "@/services/curasService";
import { buscarReceita } from "@/services/receitasService";
import { calcularAguaPorCiclo } from "@/utils/calcularAguaPorCiclo";
import {
  calcularDiasRestantes,
  calcularProgresso,
  formatarData,
  labelTipoConcreto,
  labelTipoPeca,
} from "@/utils/formatters";
import { Cura, Receita, ResultadoCalculo } from "@/types";
import styles from "./detalhe.module.css";

export default function DetalheCuraPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cura, setCura] = useState<Cura | null>(null);
  const [receita, setReceita] = useState<Receita | null>(null);
  const [calculo, setCalculo] = useState<ResultadoCalculo | null>(null);

  function recarregar() {
    const c = buscarCura(id);
    if (!c) return;
    setCura(c);
    const r = buscarReceita(c.receitaId) ?? null;
    setReceita(r);
    if (r) {
      setCalculo(
        calcularAguaPorCiclo({
          aguaBaseMl: r.aguaBaseMl,
          vazaoBombaMlSegundo: r.vazaoBombaMlSegundo,
          temperatura: c.temperaturaAtual,
          umidade: c.umidadeAtual,
        })
      );
    }
  }

  useEffect(() => {
    recarregar();
  }, [id]);

  if (!cura) {
    return (
      <AppShell>
        <p style={{ color: "var(--color-text-muted)" }}>Cura não encontrada.</p>
      </AppShell>
    );
  }

  const diasRestantes = receita ? calcularDiasRestantes(cura.inicioCura, receita.diasCura) : 0;
  const progresso = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;

  function atualizar(campos: Partial<Cura>) {
    atualizarCura(cura!.id, campos);
    recarregar();
  }

  function simularBomba() {
    if (!calculo) return;
    registrarLeitura(cura!.id, {
      temperatura: cura!.temperaturaAtual,
      umidade: cura!.umidadeAtual,
      aguaAplicadaMl: calculo.aguaPorCicloMl,
      bombaAcionada: true,
      dataHora: new Date().toISOString(),
    });
    recarregar();
  }

  function registrarLeituraSemBomba() {
    if (!calculo) return;
    registrarLeitura(cura!.id, {
      temperatura: cura!.temperaturaAtual,
      umidade: cura!.umidadeAtual,
      aguaAplicadaMl: 0,
      bombaAcionada: false,
      dataHora: new Date().toISOString(),
    });
    recarregar();
  }

  function finalizar() {
    if (confirm("Finalizar esta cura?")) {
      atualizar({ status: "finalizada" });
    }
  }

  const aguaTotalEstimada =
    receita && calculo
      ? Math.round((24 / 8) * receita.diasCura * calculo.aguaPorCicloMl)
      : 0;

  return (
    <AppShell>
      <div className={styles.back}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
          ← Voltar
        </button>
      </div>

      {/* Cabeçalho */}
      <div className={styles.topRow}>
        <div>
          <div className={styles.titleRow}>
            <h1 className="page-title" style={{ margin: 0 }}>{cura.nomeIdentificacao}</h1>
            <StatusBadge status={cura.status} />
          </div>
          {receita && (
            <p className={styles.receitaLabel}>
              {receita.nome} · {labelTipoPeca(receita.tipoPeca)} · {labelTipoConcreto(receita.tipoConcreto)}
            </p>
          )}
        </div>
        {cura.status !== "finalizada" && (
          <button className="btn btn-danger" onClick={finalizar}>
            Finalizar Cura
          </button>
        )}
      </div>

      {/* Progresso */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <span>Progresso da cura</span>
          <span>{progresso}% · {diasRestantes} dia{diasRestantes !== 1 ? "s" : ""} restante{diasRestantes !== 1 ? "s" : ""}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progresso}%` }} />
        </div>
        {receita?.objetivoFinal && (
          <p className={styles.objetivo}>Objetivo: {receita.objetivoFinal}</p>
        )}
      </div>

      <div className={styles.grid}>
        {/* Painel de sensores */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Condições atuais</h3>

          <div className={styles.sensorRow}>
            <div className={`${styles.sensorBox} ${cura.temperaturaAtual > 30 ? styles.danger : ""}`}>
              <span>🌡</span>
              <div>
                <p className={styles.sensorLabel}>Temperatura</p>
                <p className={styles.sensorVal}>{cura.temperaturaAtual}°C</p>
              </div>
            </div>
            <div className={`${styles.sensorBox} ${cura.umidadeAtual < 60 ? styles.warning : ""}`}>
              <span>💧</span>
              <div>
                <p className={styles.sensorLabel}>Umidade</p>
                <p className={styles.sensorVal}>{cura.umidadeAtual}%</p>
              </div>
            </div>
          </div>

          {cura.status !== "finalizada" && (
            <>
              <div className={styles.btnGroup}>
                <button className="btn btn-secondary btn-sm" onClick={() => atualizar({ temperaturaAtual: cura.temperaturaAtual + 2 })}>+ Temp.</button>
                <button className="btn btn-secondary btn-sm" onClick={() => atualizar({ temperaturaAtual: Math.max(0, cura.temperaturaAtual - 2) })}>− Temp.</button>
                <button className="btn btn-secondary btn-sm" onClick={() => atualizar({ umidadeAtual: Math.min(100, cura.umidadeAtual + 10) })}>+ Umidade</button>
                <button className="btn btn-secondary btn-sm" onClick={() => atualizar({ umidadeAtual: Math.max(0, cura.umidadeAtual - 10) })}>− Umidade</button>
              </div>
              <div className={styles.btnGroup} style={{ marginTop: 8 }}>
                <button className="btn btn-warning btn-sm" onClick={() => atualizar({ umidadeAtual: 45, temperaturaAtual: 34, status: "alerta" })}>
                  ☀ Amb. seco
                </button>
                <button className="btn btn-success btn-sm" onClick={() => atualizar({ umidadeAtual: 88, temperaturaAtual: 20, status: "ativa" })}>
                  🌧 Amb. úmido
                </button>
              </div>
            </>
          )}
        </div>

        {/* Painel de cálculo */}
        {calculo && receita && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Cálculo hídrico</h3>
            <div className={styles.paramList}>
              <div className={styles.paramRow}>
                <span>Classificação umidade</span>
                <span className={`badge ${calculo.classificacaoUmidade === "baixa" ? "badge-red" : calculo.classificacaoUmidade === "alta" ? "badge-blue" : "badge-green"}`}>
                  {calculo.classificacaoUmidade}
                </span>
              </div>
              <div className={styles.paramRow}>
                <span>Classificação temperatura</span>
                <span className={`badge ${calculo.classificacaoTemperatura === "alta" ? "badge-red" : calculo.classificacaoTemperatura === "media" ? "badge-yellow" : "badge-green"}`}>
                  {calculo.classificacaoTemperatura}
                </span>
              </div>
              <div className={styles.paramRow}>
                <span>Fator umidade</span>
                <strong>×{calculo.fatorUmidade}</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Fator temperatura</span>
                <strong>×{calculo.fatorTemperatura}</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Água base/ciclo</span>
                <strong>{receita.aguaBaseMl} ml</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Água por ciclo</span>
                <strong className={styles.destaque}>{calculo.aguaPorCicloMl} ml</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Tempo bomba/ciclo</span>
                <strong>{calculo.tempoBombaSegundos}s</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Vazão da bomba</span>
                <strong>{receita.vazaoBombaMlSegundo} ml/s</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Água total estimada</span>
                <strong>{(aguaTotalEstimada / 1000).toFixed(1)} L</strong>
              </div>
              <div className={styles.paramRow}>
                <span>Água total usada</span>
                <strong>{(cura.aguaTotalUsadaMl / 1000).toFixed(2)} L</strong>
              </div>
            </div>

            {cura.status !== "finalizada" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                <button className="btn btn-primary btn-full" onClick={simularBomba}>
                  ⟳ Simular bomba ligada
                </button>
                <button className="btn btn-secondary btn-full" onClick={registrarLeituraSemBomba}>
                  ◎ Registrar leitura sem bomba
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div style={{ marginTop: 32 }}>
        <h2 className="section-title">
          Histórico de leituras ({cura.historico.length})
        </h2>
        <div className="table-container">
          {cura.historico.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma leitura registrada ainda.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Temp. (°C)</th>
                  <th>Umidade (%)</th>
                  <th>Água (ml)</th>
                  <th>Bomba</th>
                </tr>
              </thead>
              <tbody>
                {[...cura.historico].reverse().map((h) => (
                  <tr key={h.id}>
                    <td>{formatarData(h.dataHora)}</td>
                    <td>{h.temperatura}</td>
                    <td>{h.umidade}</td>
                    <td>{h.aguaAplicadaMl}</td>
                    <td>
                      {h.bombaAcionada
                        ? <span className="badge badge-green">Acionada</span>
                        : <span className="badge badge-yellow">Inativa</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
