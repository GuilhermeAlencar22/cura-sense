"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { listarCuras, listarCurasAtivas } from "@/services/curasService";
import { listarLotes } from "@/services/lotesService";
import { listarReceitas, buscarReceita } from "@/services/receitasService";
import {
  calcularDiasRestantes,
  calcularProgresso,
  labelTipoPeca,
} from "@/utils/formatters";
import {
  avaliarLeitura,
  labelConformidadeTelemetria,
} from "@/utils/calcularConformidadeTelemetria";
import { CuraLote } from "@/types";
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

  const ativas    = curas.filter((c) => c.status === "em_cura");
  const emAlerta  = curas.filter((c) => c.status === "interrompida");
  const concluidas = curas.filter((c) => c.status === "concluida");

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

      <div className="cards-grid">
        <StatCard label="Lotes em cura"       value={ativas.length}     icon="⟳" variant="blue" />
        <StatCard label="Interrompidas"        value={emAlerta.length}   icon="⚠" variant="red"  />
        <StatCard label="Concluídas"           value={concluidas.length} icon="✓" variant="green" />
        <StatCard label="Total de lotes"       value={totalLotes}        icon="⊞" />
        <StatCard label="Receitas cadastradas" value={totalReceitas}     icon="✦" variant="blue" />
      </div>

      <h2 className="section-title">Curas ativas</h2>
      <div className="table-container">
        {ativas.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2.5rem" }}>⟳</span>
            <p>Nenhuma cura ativa no momento.</p>
            <Link
              href="/producao/nova"
              className="btn btn-primary"
              style={{ marginTop: 16, display: "inline-flex" }}
            >
              Registrar primeiro lote
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Receita</th>
                <th>Status</th>
                <th>Câmara</th>
                <th>Conformidade</th>
                <th>Progresso</th>
                <th>Dias restantes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ativas.map((cura) => {
                const receita = buscarReceita(cura.receitaId);
                const progresso = receita
                  ? calcularProgresso(cura.inicioCura, receita.diasCura)
                  : 0;
                const diasRestantes = calcularDiasRestantes(cura.previsaoFim);

                const temLeitura =
                  cura.temperaturaAtual !== null && cura.umidadeAtual !== null;
                const conformidade = temLeitura
                  ? avaliarLeitura(
                      cura.temperaturaAtual!,
                      cura.umidadeAtual!,
                      cura.parametros
                    )
                  : null;

                return (
                  <tr key={cura.id}>
                    <td>
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {cura.loteId}
                      </span>
                    </td>
                    <td>
                      {receita
                        ? `${receita.nome} · ${labelTipoPeca(receita.tipoPeca)}`
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge status={cura.status} />
                    </td>
                    <td>
                      {temLeitura ? (
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {cura.temperaturaAtual}°C · {cura.umidadeAtual}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {conformidade ? (
                        <span className={conformidadeCls(conformidade.geral)}>
                          {labelConformidadeTelemetria(conformidade.geral)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>
                          Sem dados
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.progressMini}>
                        <div className={styles.progressBarMini}>
                          <div
                            className={styles.progressFillMini}
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                        <span>{progresso}%</span>
                      </div>
                    </td>
                    <td>{diasRestantes} dias</td>
                    <td>
                      <Link
                        href={`/curas/${cura.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Ver
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

function conformidadeCls(s: string): string {
  if (s === "conforme")      return styles.tagConforme;
  if (s === "desvio_leve")   return styles.tagDesvioLeve;
  if (s === "desvio_critico") return styles.tagDesvioCritico;
  return "";
}
