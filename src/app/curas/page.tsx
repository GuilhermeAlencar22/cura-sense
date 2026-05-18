"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { listarCuras, excluirCura } from "@/services/curasService";
import { buscarReceita } from "@/services/receitasService";
import { calcularAguaPorCiclo } from "@/utils/calcularAguaPorCiclo";
import { calcularDiasRestantes, calcularProgresso } from "@/utils/formatters";
import { Cura } from "@/types";
import styles from "./curas.module.css";

export default function CurasPage() {
  const [curas, setCuras] = useState<Cura[]>([]);

  function recarregar() {
    setCuras(listarCuras());
  }

  useEffect(() => {
    recarregar();
  }, []);

  function handleExcluir(id: string) {
    if (confirm("Deseja remover esta cura? O histórico de leituras será perdido.")) {
      excluirCura(id);
      recarregar();
    }
  }

  const ativas = curas.filter((c) => c.status !== "finalizada");
  const finalizadas = curas.filter((c) => c.status === "finalizada");

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Curas</h1>
          <p className="page-subtitle">Acompanhe todas as curas em andamento e finalizadas.</p>
        </div>
        <Link href="/receitas" className="btn btn-primary">
          + Iniciar Cura
        </Link>
      </div>

      {curas.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: "2.5rem" }}>⟳</span>
          <p>Nenhuma cura iniciada ainda.</p>
          <Link href="/receitas" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
            Ir para Receitas para iniciar
          </Link>
        </div>
      ) : (
        <>
          {ativas.length > 0 && (
            <>
              <h2 className="section-title">Ativas ({ativas.length})</h2>
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

function CuraCard({ cura, onExcluir }: { cura: Cura; onExcluir: (id: string) => void }) {
  const receita = buscarReceita(cura.receitaId);
  const diasRestantes = receita ? calcularDiasRestantes(cura.inicioCura, receita.diasCura) : 0;
  const progresso = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;
  const calculo = receita
    ? calcularAguaPorCiclo({
        aguaBaseMl: receita.aguaBaseMl,
        vazaoBombaMlSegundo: receita.vazaoBombaMlSegundo,
        temperatura: cura.temperaturaAtual,
        umidade: cura.umidadeAtual,
      })
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{cura.nomeIdentificacao}</h3>
          {receita && (
            <p className={styles.cardSub}>{receita.nome}</p>
          )}
        </div>
        <StatusBadge status={cura.status} />
      </div>

      {/* Barra de progresso */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progresso}%` }} />
        </div>
        <span className={styles.progressLabel}>{progresso}%</span>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricIcon}>🌡</span>
          <span className={`${styles.metricVal} ${cura.temperaturaAtual > 30 ? styles.danger : ""}`}>
            {cura.temperaturaAtual}°C
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricIcon}>💧</span>
          <span className={`${styles.metricVal} ${cura.umidadeAtual < 60 ? styles.warning : ""}`}>
            {cura.umidadeAtual}%
          </span>
        </div>
        {calculo && (
          <div className={styles.metric}>
            <span className={styles.metricIcon}>🚿</span>
            <span className={styles.metricVal}>{calculo.aguaPorCicloMl} ml</span>
          </div>
        )}
        <div className={styles.metric}>
          <span className={styles.metricIcon}>⏱</span>
          <span className={styles.metricVal}>
            {cura.status === "finalizada" ? "—" : `${diasRestantes}d`}
          </span>
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
