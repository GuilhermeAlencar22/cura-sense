"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { iniciarCura, buscarCuraPorLote } from "@/services/curasService";
import { listarLotes, buscarLote } from "@/services/lotesService";
import { buscarReceita } from "@/services/receitasService";
import {
  labelTipoPeca,
  labelTipoConcreto,
  labelAmbienteCura,
  labelConformidade,
  formatarDataCurta,
} from "@/utils/formatters";
import { LoteProducao, ReceitaTraco, CuraLote } from "@/types";
import styles from "./nova.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDesvio(d: number): string {
  return `${d > 0 ? "+" : ""}${d}%`;
}

function clsDesvio(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 3) return styles.desvioOk;
  if (abs <= 8) return styles.desvioLeve;
  return styles.desvioCritico;
}

function conformidadeBadgeCls(c: string): string {
  if (c === "conforme") return "badge-green";
  if (c === "desvio_leve") return "badge-yellow";
  return "badge-red";
}

function calcularPrevisaoFim(diasCura: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasCura);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Form principal ───────────────────────────────────────────────────────────

function NovaCuraForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loteIdParam = searchParams.get("loteId") ?? "";

  const [lotes, setLotes] = useState<LoteProducao[]>([]);
  const [loteId, setLoteId] = useState(loteIdParam);
  const [curaExistente, setCuraExistente] = useState<CuraLote | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [confirmarCritico, setConfirmarCritico] = useState(false);

  useEffect(() => {
    const lista = listarLotes();
    setLotes(lista);
    if (!loteId && lista.length > 0) setLoteId(lista[0].id);
  }, []);

  // Atualiza cura existente sempre que o loteId muda
  useEffect(() => {
    if (!loteId) { setCuraExistente(null); return; }
    const cura = buscarCuraPorLote(loteId);
    setCuraExistente(cura ?? null);
    setConfirmarCritico(false);
  }, [loteId]);

  const lote = buscarLote(loteId);
  const receita = lote ? buscarReceita(lote.receitaId) : null;

  function handleIniciar() {
    if (!loteId || !lote || !receita) return;

    // Se desvio crítico e ainda não confirmou, exibe alerta
    if (lote.conformidade === "desvio_critico" && !confirmarCritico) {
      setConfirmarCritico(true);
      return;
    }

    setIniciando(true);
    try {
      const cura = iniciarCura(loteId);
      router.push(`/curas/${cura.id}`);
    } finally {
      setIniciando(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
          ← Voltar
        </button>
        <div>
          <h1 className="page-title">Iniciar Cura</h1>
          <p className="page-subtitle">Vincule um lote de produção e inicie o acompanhamento da cura</p>
        </div>
      </div>

      {/* Seletor de lote — só visível se não veio loteId na URL */}
      {!loteIdParam && (
        <section className={styles.card} style={{ marginBottom: 20, maxWidth: 520 }}>
          <h2 className={styles.cardTitle}>Selecionar Lote</h2>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lote de produção</label>
            <select
              className="form-select"
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
            >
              {lotes.length === 0 && <option value="">Nenhum lote disponível</option>}
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>{l.nomeIdentificacao}</option>
              ))}
            </select>
            <p className="form-hint">
              Sem lotes?{" "}
              <a href="/producao/nova" style={{ color: "var(--color-primary)" }}>
                Registre um lote primeiro.
              </a>
            </p>
          </div>
        </section>
      )}

      {lote && receita ? (
        <div className={styles.layout}>

          {/* ── Coluna principal ─────────────────────────────────────────── */}
          <div className={styles.mainCol}>

            {/* Card 1: Resumo do lote */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Resumo do Lote</h2>
              <div className={styles.resumoGrid}>
                <div className={styles.resumoItem}>
                  <span>Nome</span>
                  <strong>{lote.nomeIdentificacao}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Receita</span>
                  <strong>{receita.nome}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Tipo de peça</span>
                  <strong>{labelTipoPeca(receita.tipoPeca)}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Tipo de concreto</span>
                  <strong>{labelTipoConcreto(receita.tipoConcreto)}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Quantidade</span>
                  <strong>{lote.quantidadePecas} peça{lote.quantidadePecas !== 1 ? "s" : ""}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Registrado em</span>
                  <strong>{formatarDataCurta(lote.criadoEm)}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Conformidade</span>
                  <span className={`badge ${conformidadeBadgeCls(lote.conformidade)}`}>
                    {labelConformidade(lote.conformidade)}
                  </span>
                </div>
                {lote.observacoes && (
                  <div className={`${styles.resumoItem} ${styles.resumoItemFull}`}>
                    <span>Observações</span>
                    <strong>{lote.observacoes}</strong>
                  </div>
                )}
              </div>
            </section>

            {/* Card 2: Traço e dosagem */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Traço e Dosagem</h2>

              {/* Relações padrão vs real */}
              <div className={styles.relacoesRow}>
                <div className={styles.relacaoBloco}>
                  <p className={styles.relacaoBlocoLabel}>A/C padrão</p>
                  <p className={styles.relacaoBlocoVal}>{receita.relacaoAguaCimento.toFixed(3)}</p>
                </div>
                <div className={styles.relacaoSeta}>→</div>
                <div className={styles.relacaoBloco}>
                  <p className={styles.relacaoBlocoLabel}>A/C real</p>
                  <p className={styles.relacaoBlocoVal}>{lote.relacaoAguaCimentoReal.toFixed(3)}</p>
                </div>
                <span className={`${styles.relacaoDesvioTag} ${clsDesvio(lote.desvioPercentualAC)}`}>
                  {fmtDesvio(lote.desvioPercentualAC)}
                </span>
              </div>

              <div className={styles.relacoesRow}>
                <div className={styles.relacaoBloco}>
                  <p className={styles.relacaoBlocoLabel}>Cim./Agr. padrão</p>
                  <p className={styles.relacaoBlocoVal}>{receita.relacaoMassaAgregado.toFixed(3)}</p>
                </div>
                <div className={styles.relacaoSeta}>→</div>
                <div className={styles.relacaoBloco}>
                  <p className={styles.relacaoBlocoLabel}>Cim./Agr. real</p>
                  <p className={styles.relacaoBlocoVal}>{lote.relacaoMassaAgregadoReal.toFixed(3)}</p>
                </div>
                <span className={`${styles.relacaoDesvioTag} ${clsDesvio(lote.desvioPercentualMA)}`}>
                  {fmtDesvio(lote.desvioPercentualMA)}
                </span>
              </div>

              {/* Desvios por insumo */}
              <div className={styles.desviosInsumo}>
                <p className={styles.desviosTitle}>Desvio por insumo</p>
                {(
                  [
                    { label: "Cimento", padrao: receita.massaCimento, real: lote.massaCimentoReal },
                    { label: "Agregado", padrao: receita.massaAgregado, real: lote.massaAgregadoReal },
                    { label: "Água", padrao: receita.massaAgua, real: lote.massaAguaReal },
                    ...(receita.massaPigmento > 0
                      ? [{ label: "Pigmento", padrao: receita.massaPigmento, real: lote.massaPigmentoReal }]
                      : []),
                    ...(receita.massaAditivos > 0
                      ? [{ label: "Aditivos", padrao: receita.massaAditivos, real: lote.massaAditivosReal }]
                      : []),
                  ] as { label: string; padrao: number; real: number }[]
                ).map(({ label, padrao, real }) => {
                  const d = padrao > 0 ? Math.round(((real - padrao) / padrao) * 1000) / 10 : 0;
                  return (
                    <div key={label} className={styles.desvioRow}>
                      <span className={styles.desvioLabel}>{label}</span>
                      <span className={styles.desvioMassas}>{padrao} g → {real} g</span>
                      <div className={styles.desvioBar}>
                        <div
                          className={`${styles.desvioBarFill} ${clsDesvio(d)}`}
                          style={{ width: `${Math.min(Math.abs(d) * 5, 100)}%` }}
                        />
                      </div>
                      <span className={`${styles.desvioValor} ${clsDesvio(d)}`}>
                        {fmtDesvio(d)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

          {/* ── Coluna lateral: cura + ação ───────────────────────────── */}
          <div className={styles.sideCol}>
            <div className={styles.stickyBox}>

              {/* Card 3: Configuração da cura */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Configuração da Cura</h2>
                <div className={styles.curaGrid}>
                  <div className={styles.curaItem}>
                    <span>Ambiente</span>
                    <strong>{labelAmbienteCura(receita.ambienteCura)}</strong>
                  </div>
                  <div className={styles.curaItem}>
                    <span>Duração</span>
                    <strong>{receita.diasCura} dias</strong>
                  </div>
                  <div className={styles.curaItem}>
                    <span>Previsão de término</span>
                    <strong>{calcularPrevisaoFim(receita.diasCura)}</strong>
                  </div>
                  <div className={styles.curaItem}>
                    <span>Temperatura e umidade iniciais</span>
                    <strong className={styles.valorSimulado}>registrado pelo ESP32</strong>
                  </div>
                </div>
              </section>

              {/* Card 4: Orientação prática */}
              <section className={`${styles.card} ${styles.cardOrientacao}`}>
                <p className={styles.orientacaoIcone}>📋</p>
                <p className={styles.orientacaoTexto}>
                  Posicione a peça na câmara de cura, ligue o ESP32 e inicie o acompanhamento.
                </p>
                {receita.observacoes && (
                  <p className={styles.orientacaoObs}>{receita.observacoes}</p>
                )}
              </section>

              {/* Alerta de desvio crítico */}
              {confirmarCritico && (
                <div className={styles.alertaCritico}>
                  <p className={styles.alertaIcone}>⚠</p>
                  <div>
                    <p className={styles.alertaTitulo}>Desvio crítico detectado</p>
                    <p className={styles.alertaDesc}>
                      Este lote tem desvio acima de 8% em relação ao traço padrão.
                      Isso pode comprometer a resistência e a aparência da peça.
                      Clique em "Confirmar e iniciar" para prosseguir mesmo assim.
                    </p>
                  </div>
                </div>
              )}

              {/* Cura já existente */}
              {curaExistente ? (
                <div className={styles.curaExistente}>
                  <p className={styles.curaExistenteTexto}>
                    Este lote já tem uma cura em andamento.
                  </p>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => router.push(`/curas/${curaExistente.id}`)}
                  >
                    Ver cura →
                  </button>
                </div>
              ) : (
                <div className={styles.acoes}>
                  {confirmarCritico ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setConfirmarCritico(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        className={`btn ${styles.btnCritico}`}
                        onClick={handleIniciar}
                        disabled={iniciando}
                      >
                        {iniciando ? "Iniciando..." : "Confirmar e iniciar"}
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-primary btn-full"
                      onClick={handleIniciar}
                      disabled={iniciando || !loteId}
                    >
                      {iniciando ? "Iniciando..." : "▶ Iniciar Cura"}
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      ) : loteId ? (
        <p style={{ color: "var(--color-text-muted)", marginTop: 24 }}>
          Lote não encontrado.{" "}
          <a href="/producao" style={{ color: "var(--color-primary)" }}>Ver todos os lotes.</a>
        </p>
      ) : null}
    </AppShell>
  );
}

export default function NovaCuraPage() {
  return (
    <Suspense>
      <NovaCuraForm />
    </Suspense>
  );
}
