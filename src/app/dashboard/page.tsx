"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { listarCuras } from "@/services/curasService";
import { buscarReceita } from "@/services/receitasService";
import { calcularAguaPorCiclo } from "@/utils/calcularAguaPorCiclo";
import { calcularDiasRestantes, calcularProgresso } from "@/utils/formatters";
import { Cura } from "@/types";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [curas, setCuras] = useState<Cura[]>([]);

  useEffect(() => {
    setCuras(listarCuras());
  }, []);

  const ativas = curas.filter((c) => c.status === "ativa" || c.status === "alerta");
  const finalizadas = curas.filter((c) => c.status === "finalizada");
  const emAlerta = curas.filter((c) => c.status === "alerta");

  const mediaTemp = ativas.length
    ? (ativas.reduce((a, c) => a + c.temperaturaAtual, 0) / ativas.length).toFixed(1)
    : "—";

  const mediaUmidade = ativas.length
    ? (ativas.reduce((a, c) => a + c.umidadeAtual, 0) / ativas.length).toFixed(1)
    : "—";

  const aguaTotal = curas.reduce((acc, c) => acc + c.aguaTotalUsadaMl, 0);

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral de todas as curas ativas.</p>
        </div>
        <Link href="/receitas" className="btn btn-primary">
          + Iniciar Cura
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="cards-grid">
        <StatCard label="Curas ativas" value={ativas.length} icon="⟳" variant="blue" />
        <StatCard label="Em alerta" value={emAlerta.length} icon="⚠" variant="red" />
        <StatCard label="Finalizadas" value={finalizadas.length} icon="✓" variant="green" />
        <StatCard label="Total de curas" value={curas.length} icon="⊞" />
        <StatCard
          label="Temperatura média"
          value={mediaTemp}
          unit="°C"
          icon="🌡"
          variant={parseFloat(String(mediaTemp)) > 30 ? "yellow" : "default"}
        />
        <StatCard label="Umidade média" value={mediaUmidade} unit="%" icon="💧" variant="blue" />
        <StatCard
          label="Água total aplicada"
          value={(aguaTotal / 1000).toFixed(1)}
          unit="L"
          icon="🚿"
          variant="green"
        />
      </div>

      {/* Tabela de curas ativas */}
      <h2 className="section-title">Curas ativas</h2>
      <div className="table-container">
        {ativas.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2.5rem" }}>⟳</span>
            <p>Nenhuma cura ativa no momento.</p>
            <Link href="/receitas" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
              Iniciar primeira cura
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Identificação</th>
                <th>Status</th>
                <th>Temp. (°C)</th>
                <th>Umidade (%)</th>
                <th>Água/Ciclo</th>
                <th>Progresso</th>
                <th>Restante</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ativas.map((cura) => {
                const receita = buscarReceita(cura.receitaId);
                const calculo = receita
                  ? calcularAguaPorCiclo({
                      aguaBaseMl: receita.aguaBaseMl,
                      vazaoBombaMlSegundo: receita.vazaoBombaMlSegundo,
                      temperatura: cura.temperaturaAtual,
                      umidade: cura.umidadeAtual,
                    })
                  : null;
                const progresso = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;
                const diasRestantes = receita ? calcularDiasRestantes(cura.inicioCura, receita.diasCura) : 0;

                return (
                  <tr key={cura.id}>
                    <td>
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {cura.nomeIdentificacao}
                      </span>
                    </td>
                    <td><StatusBadge status={cura.status} /></td>
                    <td className={cura.temperaturaAtual > 30 ? styles.tempAlta : ""}>
                      {cura.temperaturaAtual}
                    </td>
                    <td className={cura.umidadeAtual < 60 ? styles.umidadeBaixa : ""}>
                      {cura.umidadeAtual}
                    </td>
                    <td>{calculo ? `${calculo.aguaPorCicloMl} ml` : "—"}</td>
                    <td>
                      <div className={styles.progressMini}>
                        <div className={styles.progressBarMini}>
                          <div className={styles.progressFillMini} style={{ width: `${progresso}%` }} />
                        </div>
                        <span>{progresso}%</span>
                      </div>
                    </td>
                    <td>{diasRestantes} dias</td>
                    <td>
                      <Link href={`/curas/${cura.id}`} className="btn btn-secondary btn-sm">
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
