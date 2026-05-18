"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { listarReceitas, buscarReceita } from "@/services/receitasService";
import { registrarLote } from "@/services/lotesService";
import { calcularRelacoesDosagem, calcularDesvio } from "@/utils/calcularRelacoes";
import {
  labelTipoPeca,
  labelTipoConcreto,
  labelAmbienteCura,
  labelConformidade,
} from "@/utils/formatters";
import { ReceitaTraco, ResultadoRelacoes } from "@/types";
import styles from "./nova.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseG(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmtDesvio(d: number): string {
  return `${d > 0 ? "+" : ""}${d}%`;
}

function clsDesvio(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 3) return styles.desvioOk;
  if (abs <= 8) return styles.desvioLeve;
  return styles.desvioCritico;
}

function clsConformidade(c: string): string {
  if (c === "conforme") return styles.badgeConforme;
  if (c === "desvio_leve") return styles.badgeLeve;
  return styles.badgeCritico;
}

// ─── Form state ──────────────────────────────────────────────────────────────

type FormState = {
  receitaId: string;
  nome: string;
  quantidadePecas: string;
  responsavel: string;
  dataProducao: string;
  cimento: string;
  agregado: string;
  pigmento: string;
  aditivos: string;
  agua: string;
  observacoes: string;
};

function formInicial(receitaIdParam: string, receita: ReceitaTraco | undefined): FormState {
  return {
    receitaId: receitaIdParam,
    nome: receita ? `Lote — ${receita.nome}` : "",
    quantidadePecas: "1",
    responsavel: "",
    dataProducao: new Date().toISOString().slice(0, 10),
    cimento: receita ? String(receita.massaCimento) : "",
    agregado: receita ? String(receita.massaAgregado) : "",
    pigmento: receita ? String(receita.massaPigmento) : "",
    aditivos: receita ? String(receita.massaAditivos) : "",
    agua: receita ? String(receita.massaAgua) : "",
    observacoes: "",
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

function NovoLoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receitaIdParam = searchParams.get("receitaId") ?? "";

  const [receitas, setReceitas] = useState<ReceitaTraco[]>([]);
  const [form, setForm] = useState<FormState>(() =>
    formInicial(receitaIdParam, receitaIdParam ? buscarReceita(receitaIdParam) : undefined)
  );
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const lista = listarReceitas();
    setReceitas(lista);
    if (!form.receitaId && lista.length > 0) {
      const primeira = lista[0];
      setForm(formInicial(primeira.id, primeira));
    }
  }, []);

  const receita = buscarReceita(form.receitaId);

  // Preenche os campos com os valores padrão ao trocar de receita
  function handleTrocarReceita(novoId: string) {
    const r = buscarReceita(novoId);
    setForm(formInicial(novoId, r));
    setErros({});
  }

  function set(campo: keyof FormState, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  // ── Comparativo em tempo real ────────────────────────────────────────────

  const comparativo = useMemo<ResultadoRelacoes | null>(() => {
    if (!receita) return null;
    const cimento = parseG(form.cimento);
    const agregado = parseG(form.agregado);
    const agua = parseG(form.agua);
    if (cimento === 0 && agua === 0) return null;
    return calcularRelacoesDosagem({
      massaCimento: cimento,
      massaAgregado: agregado,
      massaAgua: agua,
      massaCimentoPadrao: receita.massaCimento,
      massaAgregadoPadrao: receita.massaAgregado,
      massaAguaPadrao: receita.massaAgua,
    });
  }, [form.cimento, form.agregado, form.agua, receita]);

  const desviosCampos = useMemo(() => {
    if (!receita) return null;
    return {
      cimento: calcularDesvio(parseG(form.cimento), receita.massaCimento),
      agregado: calcularDesvio(parseG(form.agregado), receita.massaAgregado),
      pigmento: receita.massaPigmento > 0
        ? calcularDesvio(parseG(form.pigmento), receita.massaPigmento)
        : null,
      aditivos: receita.massaAditivos > 0
        ? calcularDesvio(parseG(form.aditivos), receita.massaAditivos)
        : null,
      agua: calcularDesvio(parseG(form.agua), receita.massaAgua),
    };
  }, [form.cimento, form.agregado, form.pigmento, form.aditivos, form.agua, receita]);

  // ── Validação ─────────────────────────────────────────────────────────────

  function validar(): boolean {
    const novos: Partial<Record<keyof FormState, string>> = {};
    if (!form.receitaId) novos.receitaId = "Selecione uma receita";
    if (!form.nome.trim()) novos.nome = "Nome do lote é obrigatório";
    const qtd = parseInt(form.quantidadePecas);
    if (isNaN(qtd) || qtd < 1) novos.quantidadePecas = "Mínimo 1 peça";
    if (parseG(form.cimento) === 0) novos.cimento = "Informe a massa de cimento";
    if (parseG(form.agregado) === 0) novos.agregado = "Informe a massa de agregado";
    if (parseG(form.agua) === 0) novos.agua = "Informe a massa de água";
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function salvar(iniciarCura: boolean) {
    if (!validar()) return;
    setSalvando(true);
    try {
      const lote = registrarLote({
        receitaId: form.receitaId,
        nomeIdentificacao: form.nome.trim(),
        quantidadePecas: parseInt(form.quantidadePecas),
        massaCimentoReal: parseG(form.cimento),
        massaAgregadoReal: parseG(form.agregado),
        massaPigmentoReal: parseG(form.pigmento),
        massaAditivosReal: parseG(form.aditivos),
        massaAguaReal: parseG(form.agua),
        observacoes: form.observacoes.trim(),
      });
      if (iniciarCura) {
        router.push(`/curas/nova?loteId=${lote.id}`);
      } else {
        router.push("/producao");
      }
    } finally {
      setSalvando(false);
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
          <h1 className="page-title">Novo Lote de Produção</h1>
          <p className="page-subtitle">Registre a dosagem real utilizada e compare com o traço padrão</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Coluna esquerda: formulário ────────────────────────────────── */}
        <div className={styles.formCol}>

          {/* Card 1: Receita */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Receita de Traço</h2>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Receita padrão *</label>
              <select
                className={`form-select ${erros.receitaId ? styles.inputError : ""}`}
                value={form.receitaId}
                onChange={(e) => handleTrocarReceita(e.target.value)}
              >
                {receitas.length === 0 && <option value="">Nenhuma receita cadastrada</option>}
                {receitas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
              {erros.receitaId && <span className={styles.erro}>{erros.receitaId}</span>}
            </div>

            {receita && (
              <div className={styles.receitaResumo}>
                <div className={styles.receitaBadges}>
                  <span className="badge badge-blue">{labelTipoPeca(receita.tipoPeca)}</span>
                  <span className="badge badge-yellow">{labelTipoConcreto(receita.tipoConcreto)}</span>
                  <span className="badge badge-green">{labelAmbienteCura(receita.ambienteCura)}</span>
                </div>
                <div className={styles.receitaGrid}>
                  <div className={styles.receitaItem}>
                    <span>Cimento</span><strong>{receita.massaCimento} g</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>Agregado</span><strong>{receita.massaAgregado} g</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>Água</span><strong>{receita.massaAgua} g</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>Pigmento</span><strong>{receita.massaPigmento > 0 ? `${receita.massaPigmento} g` : "—"}</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>Aditivos</span><strong>{receita.massaAditivos > 0 ? `${receita.massaAditivos} g` : "—"}</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>A/C padrão</span><strong>{receita.relacaoAguaCimento.toFixed(3)}</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>Cim./Agr. padrão</span><strong>{receita.relacaoMassaAgregado.toFixed(3)}</strong>
                  </div>
                  <div className={styles.receitaItem}>
                    <span>Dias de cura</span><strong>{receita.diasCura} dias</strong>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Card 2: Dados do lote */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Dados do Lote</h2>
            <div className="form-group">
              <label className="form-label">Nome / identificação *</label>
              <input
                className={`form-input ${erros.nome ? styles.inputError : ""}`}
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Lote 001 — Cubas verdes"
              />
              {erros.nome && <span className={styles.erro}>{erros.nome}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantidade de peças *</label>
                <input
                  className={`form-input ${erros.quantidadePecas ? styles.inputError : ""}`}
                  type="number"
                  min={1}
                  value={form.quantidadePecas}
                  onChange={(e) => set("quantidadePecas", e.target.value)}
                />
                {erros.quantidadePecas && <span className={styles.erro}>{erros.quantidadePecas}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Data de produção</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.dataProducao}
                  onChange={(e) => set("dataProducao", e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <input
                className="form-input"
                value={form.responsavel}
                onChange={(e) => set("responsavel", e.target.value)}
                placeholder="Nome do operador"
              />
            </div>
          </section>

          {/* Card 3: Dosagem real */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Dosagem Real Utilizada</h2>
            <p className={styles.cardHint}>
              Informe as massas efetivamente usadas. O sistema compara com o traço padrão em tempo real.
            </p>

            <div className={styles.dosagemGrid}>
              <InsumoField
                label="Cimento (g) *"
                value={form.cimento}
                onChange={(v) => set("cimento", v)}
                padrao={receita?.massaCimento}
                desvio={desviosCampos?.cimento ?? null}
                erro={erros.cimento}
              />
              <InsumoField
                label="Agregado (g) *"
                value={form.agregado}
                onChange={(v) => set("agregado", v)}
                padrao={receita?.massaAgregado}
                desvio={desviosCampos?.agregado ?? null}
                erro={erros.agregado}
              />
              <InsumoField
                label="Água (g) *"
                value={form.agua}
                onChange={(v) => set("agua", v)}
                padrao={receita?.massaAgua}
                desvio={desviosCampos?.agua ?? null}
                erro={erros.agua}
              />
              <InsumoField
                label="Pigmento (g)"
                value={form.pigmento}
                onChange={(v) => set("pigmento", v)}
                padrao={receita?.massaPigmento && receita.massaPigmento > 0 ? receita.massaPigmento : undefined}
                desvio={desviosCampos?.pigmento ?? null}
              />
              <InsumoField
                label="Aditivos (g)"
                value={form.aditivos}
                onChange={(v) => set("aditivos", v)}
                padrao={receita?.massaAditivos && receita.massaAditivos > 0 ? receita.massaAditivos : undefined}
                desvio={desviosCampos?.aditivos ?? null}
              />
            </div>

            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label">Observações</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Anotações sobre o processo, intercorrências..."
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
              />
            </div>
          </section>

        </div>

        {/* ── Coluna direita: comparativo sticky ────────────────────────── */}
        <div className={styles.sideCol}>
          <div className={styles.stickyBox}>

            {/* Card 4: Comparativo */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Comparativo Padrão × Real</h2>

              {!comparativo ? (
                <p className={styles.comparativoVazio}>
                  Preencha a dosagem real para ver a comparação.
                </p>
              ) : (
                <>
                  {/* Badge de conformidade */}
                  <div className={`${styles.conformidadeBanner} ${clsConformidade(comparativo.conformidade)}`}>
                    <span className={styles.conformidadeIcon}>
                      {comparativo.conformidade === "conforme" ? "✓" : comparativo.conformidade === "desvio_leve" ? "⚠" : "✕"}
                    </span>
                    <div>
                      <p className={styles.conformidadeLabel}>{labelConformidade(comparativo.conformidade)}</p>
                      <p className={styles.conformidadeDesc}>
                        {comparativo.conformidade === "conforme"
                          ? "Desvio máximo ≤ 3% — traço dentro do padrão"
                          : comparativo.conformidade === "desvio_leve"
                          ? "Desvio entre 3% e 8% — monitorar qualidade"
                          : "Desvio acima de 8% — risco de não conformidade"}
                      </p>
                    </div>
                  </div>

                  {/* Relações */}
                  <div className={styles.relacoesBox}>
                    <div className={styles.relacaoRow}>
                      <div className={styles.relacaoCol}>
                        <span className={styles.relacaoLabel}>A/C padrão</span>
                        <span className={styles.relacaoVal}>{receita?.relacaoAguaCimento.toFixed(3)}</span>
                      </div>
                      <div className={styles.relacaoSeta}>→</div>
                      <div className={styles.relacaoCol}>
                        <span className={styles.relacaoLabel}>A/C real</span>
                        <span className={styles.relacaoVal}>{comparativo.relacaoAguaCimento.toFixed(3)}</span>
                      </div>
                      <span className={`${styles.desvioTag} ${clsDesvio(comparativo.desvioPercentualAC)}`}>
                        {fmtDesvio(comparativo.desvioPercentualAC)}
                      </span>
                    </div>

                    <div className={styles.relacaoRow}>
                      <div className={styles.relacaoCol}>
                        <span className={styles.relacaoLabel}>Cim./Agr. padrão</span>
                        <span className={styles.relacaoVal}>{receita?.relacaoMassaAgregado.toFixed(3)}</span>
                      </div>
                      <div className={styles.relacaoSeta}>→</div>
                      <div className={styles.relacaoCol}>
                        <span className={styles.relacaoLabel}>Cim./Agr. real</span>
                        <span className={styles.relacaoVal}>{comparativo.relacaoMassaAgregado.toFixed(3)}</span>
                      </div>
                      <span className={`${styles.desvioTag} ${clsDesvio(comparativo.desvioPercentualMA)}`}>
                        {fmtDesvio(comparativo.desvioPercentualMA)}
                      </span>
                    </div>
                  </div>

                  {/* Tabela de desvios por insumo */}
                  {desviosCampos && (
                    <div className={styles.tabelaDesvios}>
                      <p className={styles.tabelaDesviosTitle}>Desvio por insumo</p>
                      {(
                        [
                          { label: "Cimento", d: desviosCampos.cimento },
                          { label: "Agregado", d: desviosCampos.agregado },
                          { label: "Água", d: desviosCampos.agua },
                          ...(desviosCampos.pigmento !== null ? [{ label: "Pigmento", d: desviosCampos.pigmento }] : []),
                          ...(desviosCampos.aditivos !== null ? [{ label: "Aditivos", d: desviosCampos.aditivos }] : []),
                        ] as { label: string; d: number }[]
                      ).map(({ label, d }) => (
                        <div key={label} className={styles.desvioRow}>
                          <span className={styles.desvioLabel}>{label}</span>
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
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Ações */}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.back()}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => salvar(false)}
                disabled={salvando}
              >
                Registrar lote
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => salvar(true)}
                disabled={salvando}
              >
                Registrar e iniciar cura →
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Campo de insumo com indicador de desvio inline ──────────────────────────

function InsumoField({
  label,
  value,
  onChange,
  padrao,
  desvio,
  erro,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  padrao?: number;
  desvio: number | null;
  erro?: string;
}) {
  const temDesvio = desvio !== null && padrao !== undefined && parseG(value) > 0;
  return (
    <div className={`form-group ${styles.insumoGroup}`}>
      <div className={styles.insumoLabelRow}>
        <label className="form-label">{label}</label>
        {padrao !== undefined && (
          <span className={styles.insumoHint}>padrão: {padrao} g</span>
        )}
      </div>
      <div className={styles.insumoInputWrap}>
        <input
          className={`form-input ${erro ? styles.inputError : ""}`}
          type="number"
          min={0}
          step={0.1}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {temDesvio && (
          <span className={`${styles.insumoDesvio} ${clsDesvio(desvio!)}`}>
            {fmtDesvio(desvio!)}
          </span>
        )}
      </div>
      {erro && <span className={styles.erro}>{erro}</span>}
    </div>
  );
}

export default function NovoLotePage() {
  return (
    <Suspense>
      <NovoLoteForm />
    </Suspense>
  );
}
