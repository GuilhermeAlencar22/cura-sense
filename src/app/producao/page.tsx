"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { listarLotes, excluirLote } from "@/services/lotesService";
import { buscarReceita } from "@/services/receitasService";
import { buscarCuraPorLote, iniciarCura } from "@/services/curasService";
import { labelTipoPeca, labelConformidade, formatarDataCurta } from "@/utils/formatters";
import { LoteProducao } from "@/types";
import { useRouter } from "next/navigation";
import styles from "./producao.module.css";

export default function ProducaoPage() {
  const router = useRouter();
  const [lotes, setLotes] = useState<LoteProducao[]>([]);

  function recarregar() {
    setLotes(listarLotes().slice().reverse());
  }

  useEffect(() => {
    recarregar();
  }, []);

  function handleExcluir(id: string) {
    if (confirm("Excluir este lote? Esta ação não pode ser desfeita.")) {
      excluirLote(id);
      recarregar();
    }
  }

  function handleIniciarCura(loteId: string) {
    const curaExistente = buscarCuraPorLote(loteId);
    if (curaExistente) {
      router.push(`/curas/${curaExistente.id}`);
      return;
    }
    const cura = iniciarCura(loteId);
    router.push(`/curas/${cura.id}`);
  }

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Produção</h1>
          <p className="page-subtitle">Lotes de peças registrados com dosagem real e conformidade.</p>
        </div>
        <Link href="/producao/nova" className="btn btn-primary">
          + Novo Lote
        </Link>
      </div>

      {lotes.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: "2.5rem" }}>⊞</span>
          <p>Nenhum lote registrado ainda.</p>
          <Link href="/producao/nova" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
            Registrar primeiro lote
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Receita</th>
                <th>Peças</th>
                <th>A/C real</th>
                <th>Desvio A/C</th>
                <th>Desvio Cim./Agr.</th>
                <th>Conformidade</th>
                <th>Registrado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((lote) => {
                const receita = buscarReceita(lote.receitaId);
                const cura = buscarCuraPorLote(lote.id);
                return (
                  <tr key={lote.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {lote.nomeIdentificacao}
                      </span>
                      {receita && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                          {labelTipoPeca(receita.tipoPeca)}
                        </div>
                      )}
                    </td>
                    <td>{receita?.nome ?? "—"}</td>
                    <td>{lote.quantidadePecas}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {lote.relacaoAguaCimentoReal.toFixed(3)}
                    </td>
                    <td>
                      <span className={desvioClass(lote.desvioPercentualAC)}>
                        {fmtDesvio(lote.desvioPercentualAC)}
                      </span>
                    </td>
                    <td>
                      <span className={desvioClass(lote.desvioPercentualMA)}>
                        {fmtDesvio(lote.desvioPercentualMA)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${conformidadeBadge(lote.conformidade)}`}>
                        {labelConformidade(lote.conformidade)}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                      {formatarDataCurta(lote.criadoEm)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {cura ? (
                          <Link href={`/curas/${cura.id}`} className="btn btn-secondary btn-sm">
                            Ver cura
                          </Link>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleIniciarCura(lote.id)}
                          >
                            ▶ Iniciar cura
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleExcluir(lote.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function fmtDesvio(d: number): string {
  return `${d > 0 ? "+" : ""}${d}%`;
}

function desvioClass(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 3) return styles.desvioOk;
  if (abs <= 8) return styles.desvioLeve;
  return styles.desvioCritico;
}

function conformidadeBadge(c: string): string {
  if (c === "conforme") return "badge-green";
  if (c === "desvio_leve") return "badge-yellow";
  return "badge-red";
}
