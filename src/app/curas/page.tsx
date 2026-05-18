"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { listarCuras, excluirCura } from "@/services/curasService";
import { buscarLote } from "@/services/lotesService";
import { buscarReceita } from "@/services/receitasService";
import { calcularDiasRestantes, calcularProgresso, labelTipoPeca } from "@/utils/formatters";
import { CuraLote } from "@/types";
import styles from "./curas.module.css";

export default function CurasPage() {
  const [curas, setCuras] = useState<CuraLote[]>([]);

  function recarregar() {
    setCuras(listarCuras());
  }

  useEffect(() => {
    recarregar();
  }, []);

  function handleExcluir(id: string) {
    if (confirm("Remover esta cura? O histórico de leituras será perdido.")) {
      excluirCura(id);
      recarregar();
    }
  }

  const ativas = curas.filter((c) => c.status === "em_cura" || c.status === "alerta");
  const finalizadas = curas.filter((c) => c.status === "finalizada" || c.status === "cancelada");

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Curas</h1>
          <p className="page-subtitle">Acompanhe os lotes em cura e os finalizados.</p>
        </div>
        <Link href="/producao/nova" className="btn btn-primary">
          + Novo Lote
        </Link>
      </div>

      {curas.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: "2.5rem" }}>⟳</span>
          <p>Nenhuma cura iniciada ainda.</p>
          <Link href="/producao/nova" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
            Registrar primeiro lote
          </Link>
        </div>
      ) : (
        <>
          {ativas.length > 0 && (
            <>
              <h2 className="section-title">Em cura ({ativas.length})</h2>
              <div className={styles.grid}>
                {ativas.map((cura) => (
                  <CuraCard key={cura.id} cura={cura} onExcluir={handleExcluir} />
                ))}
              </div>
            </>
          )}
          {finalizadas.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: 32 }}>
                Finalizadas ({finalizadas.length})
              </h2>
              <div className={styles.grid}>
                {finalizadas.map((cura) => (
                  <CuraCard key={cura.id} cura={cura} onExcluir={handleExcluir} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}

function CuraCard({ cura, onExcluir }: { cura: CuraLote; onExcluir: (id: string) => void }) {
  const lote = buscarLote(cura.loteId);
  const receita = buscarReceita(cura.receitaId);
  const diasRestantes = calcularDiasRestantes(cura.previsaoFim);
  const progresso = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{lote?.nomeIdentificacao ?? "Lote"}</h3>
          {receita && (
            <p className={styles.cardSub}>
              {receita.nome} · {labelTipoPeca(receita.tipoPeca)}
            </p>
          )}
        </div>
        <StatusBadge status={cura.status} />
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progresso}%` }} />
        </div>
        <span className={styles.progressLabel}>{progresso}%</span>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricIcon}>🌡</span>
          <span className={styles.metricVal}>
            {cura.temperaturaTanque != null ? `${cura.temperaturaTanque}°C` : "—"}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricIcon}>⏱</span>
          <span className={styles.metricVal}>
            {cura.status === "finalizada" ? "—" : `${diasRestantes}d`}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricIcon}>📦</span>
          <span className={styles.metricVal}>{lote?.quantidadePecas ?? "—"} pç</span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <Link href={`/curas/${cura.id}`} className="btn btn-primary btn-sm">
          Ver detalhes
        </Link>
        <button className="btn btn-danger btn-sm" onClick={() => onExcluir(cura.id)}>
          Remover
        </button>
      </div>
    </div>
  );
}
