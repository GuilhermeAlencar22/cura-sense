"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { salvarReceita } from "@/services/receitasService";
import { PARAMETROS_PADRAO } from "@/services/receitasService";
import { TipoPeca, TipoConcreto, ReceitaTraco, ModoControle } from "@/types";
import { calcularRelacoes } from "@/utils/calcularRelacoes";
import { labelTipoPeca, labelTipoConcreto, labelAmbienteCura } from "@/utils/formatters";
import styles from "./nova.module.css";

type AmbienteCura = ReceitaTraco["ambienteCura"];

const TIPOS_PECA: TipoPeca[] = ["cuba_colorida", "escalda_pes", "pia_gourmet", "bancada", "vaso", "outro"];
const TIPOS_CONCRETO: TipoConcreto[] = ["uhpc", "convencional", "armado", "alta_resistencia"];
const AMBIENTES: AmbienteCura[] = ["camara_cura", "camara_umida", "exposto"];

type FormState = {
  nome: string;
  tipoPeca: TipoPeca;
  tipoConcreto: TipoConcreto;
  massaCimento: string;
  massaAgregado: string;
  massaPigmento: string;
  massaAditivos: string;
  massaAgua: string;
  diasCura: string;
  ambienteCura: AmbienteCura;
  observacoes: string;
  // Parâmetros de cura
  temperaturaIdealMin: string;
  temperaturaIdealMax: string;
  umidadeIdealMin: string;
  umidadeIdealMax: string;
  modoControle: ModoControle;
  // Regra de irrigação
  vazaoMlPorSegundo: string;
  mlPorAcionamento: string;
  intervaloMinutos: string;
  umidadeMinima: string;
};

const p = PARAMETROS_PADRAO;

const FORM_INICIAL: FormState = {
  nome: "",
  tipoPeca: "cuba_colorida",
  tipoConcreto: "uhpc",
  massaCimento: "",
  massaAgregado: "",
  massaPigmento: "",
  massaAditivos: "",
  massaAgua: "",
  diasCura: "7",
  ambienteCura: "camara_cura",
  observacoes: "",
  temperaturaIdealMin: String(p.temperaturaIdealMin),
  temperaturaIdealMax: String(p.temperaturaIdealMax),
  umidadeIdealMin: String(p.umidadeIdealMin),
  umidadeIdealMax: String(p.umidadeIdealMax),
  modoControle: p.modoControle,
  vazaoMlPorSegundo: String(p.regraIrrigacao.vazaoMlPorSegundo),
  mlPorAcionamento: String(p.regraIrrigacao.mlPorAcionamento),
  intervaloMinutos: String(p.regraIrrigacao.intervaloMinutos),
  umidadeMinima: String(p.regraIrrigacao.umidadeMinima),
};

function parseNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

export default function NovaReceitaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});

  const relacoes = useMemo(() => {
    const cimento = parseNum(form.massaCimento);
    const agregado = parseNum(form.massaAgregado);
    const agua = parseNum(form.massaAgua);
    if (cimento === 0 && agua === 0) return null;
    return calcularRelacoes({ massaCimento: cimento, massaAgregado: agregado, massaAgua: agua });
  }, [form.massaCimento, form.massaAgregado, form.massaAgua]);

  // Duração calculada automaticamente a partir de vazão e volume
  const duracaoCalculada = useMemo(() => {
    const vazao = parseNum(form.vazaoMlPorSegundo);
    const ml = parseNum(form.mlPorAcionamento);
    if (vazao === 0) return null;
    return Math.round((ml / vazao) * 10) / 10;
  }, [form.vazaoMlPorSegundo, form.mlPorAcionamento]);

  function set(campo: keyof FormState, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar(): boolean {
    const novosErros: Partial<Record<keyof FormState, string>> = {};
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (parseNum(form.massaCimento) === 0) novosErros.massaCimento = "Informe a massa de cimento";
    if (parseNum(form.massaAgregado) === 0) novosErros.massaAgregado = "Informe a massa de agregado";
    if (parseNum(form.massaAgua) === 0) novosErros.massaAgua = "Informe a massa de água";
    const dias = parseInt(form.diasCura);
    if (isNaN(dias) || dias < 1) novosErros.diasCura = "Mínimo 1 dia";
    const tMin = parseNum(form.temperaturaIdealMin);
    const tMax = parseNum(form.temperaturaIdealMax);
    if (tMin >= tMax) novosErros.temperaturaIdealMax = "Máximo deve ser maior que o mínimo";
    const uMin = parseNum(form.umidadeIdealMin);
    const uMax = parseNum(form.umidadeIdealMax);
    if (uMin >= uMax) novosErros.umidadeIdealMax = "Máximo deve ser maior que o mínimo";
    if (parseNum(form.vazaoMlPorSegundo) === 0) novosErros.vazaoMlPorSegundo = "Informe a vazão";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSalvando(true);

    const cimento = parseNum(form.massaCimento);
    const agregado = parseNum(form.massaAgregado);
    const agua = parseNum(form.massaAgua);
    const rels = calcularRelacoes({ massaCimento: cimento, massaAgregado: agregado, massaAgua: agua });
    const vazao = parseNum(form.vazaoMlPorSegundo);
    const ml = parseNum(form.mlPorAcionamento);

    salvarReceita({
      nome: form.nome.trim(),
      tipoPeca: form.tipoPeca,
      tipoConcreto: form.tipoConcreto,
      massaCimento: cimento,
      massaAgregado: agregado,
      massaPigmento: parseNum(form.massaPigmento),
      massaAditivos: parseNum(form.massaAditivos),
      massaAgua: agua,
      relacaoAguaCimento: rels.relacaoAguaCimento,
      relacaoMassaAgregado: rels.relacaoMassaAgregado,
      diasCura: parseInt(form.diasCura),
      ambienteCura: form.ambienteCura,
      observacoes: form.observacoes.trim(),
      parametrosCura: {
        temperaturaIdealMin: parseNum(form.temperaturaIdealMin),
        temperaturaIdealMax: parseNum(form.temperaturaIdealMax),
        umidadeIdealMin: parseNum(form.umidadeIdealMin),
        umidadeIdealMax: parseNum(form.umidadeIdealMax),
        modoControle: form.modoControle,
        regraIrrigacao: {
          vazaoMlPorSegundo: vazao,
          mlPorAcionamento: ml,
          duracaoSegundos: vazao > 0 ? Math.round((ml / vazao) * 10) / 10 : 0,
          intervaloMinutos: parseNum(form.intervaloMinutos),
          umidadeMinima: parseNum(form.umidadeMinima),
        },
      },
    });

    router.push("/receitas");
  }

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
          ← Voltar
        </button>
        <div>
          <h1 className="page-title">Nova Receita de Traço</h1>
          <p className="page-subtitle">Defina o traço padrão e os parâmetros de cura para uma peça UHPC</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>

        {/* ── Identificação ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Identificação</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome da receita *</label>
              <input
                className={`form-input ${erros.nome ? styles.inputError : ""}`}
                placeholder="Ex: Cuba Colorida Verde"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
              />
              {erros.nome && <span className={styles.erro}>{erros.nome}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de peça</label>
              <select
                className="form-select"
                value={form.tipoPeca}
                onChange={(e) => set("tipoPeca", e.target.value as TipoPeca)}
              >
                {TIPOS_PECA.map((t) => (
                  <option key={t} value={t}>{labelTipoPeca(t)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de concreto</label>
              <select
                className="form-select"
                value={form.tipoConcreto}
                onChange={(e) => set("tipoConcreto", e.target.value as TipoConcreto)}
              >
                {TIPOS_CONCRETO.map((t) => (
                  <option key={t} value={t}>{labelTipoConcreto(t)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Dias de cura *</label>
              <input
                className={`form-input ${erros.diasCura ? styles.inputError : ""}`}
                type="number"
                min={1}
                value={form.diasCura}
                onChange={(e) => set("diasCura", e.target.value)}
              />
              {erros.diasCura && <span className={styles.erro}>{erros.diasCura}</span>}
              <span className="form-hint">Padrão UHPC: 7 dias em câmara de cura</span>
            </div>
          </div>
        </section>

        {/* ── Dosagem ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Dosagem Padrão</h2>
          <p className={styles.sectionHint}>
            Dosagem de referência. Lotes produzidos serão comparados com esses valores.
          </p>

          <div className={styles.dosagemGrid}>
            {[
              { label: "Cimento (g) *", campo: "massaCimento" as const },
              { label: "Agregado (g) *", campo: "massaAgregado" as const },
              { label: "Água (g) *", campo: "massaAgua" as const },
              { label: "Pigmento (g)", campo: "massaPigmento" as const },
              { label: "Aditivos (g)", campo: "massaAditivos" as const },
            ].map(({ label, campo }) => (
              <div className="form-group" key={campo}>
                <label className="form-label">{label}</label>
                <input
                  className={`form-input ${erros[campo] ? styles.inputError : ""}`}
                  type="number" min={0} step={0.1} placeholder="0"
                  value={form[campo]}
                  onChange={(e) => set(campo, e.target.value)}
                />
                {erros[campo] && <span className={styles.erro}>{erros[campo]}</span>}
              </div>
            ))}
          </div>

          <div className={`${styles.relacoesBox} ${relacoes ? styles.relacoesBoxAtivo : ""}`}>
            <p className={styles.relacoesTitle}>Relações calculadas automaticamente</p>
            <div className={styles.relacoesGrid}>
              <div className={styles.relacaoItem}>
                <span className={styles.relacaoLabel}>Relação Água/Cimento (A/C)</span>
                <span className={styles.relacaoValor}>
                  {relacoes ? relacoes.relacaoAguaCimento.toFixed(3) : "—"}
                </span>
              </div>
              <div className={styles.relacaoItem}>
                <span className={styles.relacaoLabel}>Relação Cimento/Agregado</span>
                <span className={styles.relacaoValor}>
                  {relacoes ? relacoes.relacaoMassaAgregado.toFixed(3) : "—"}
                </span>
              </div>
            </div>
            {relacoes && relacoes.relacaoAguaCimento > 0.25 && (
              <p className={styles.alerta}>
                ⚠ Relação A/C acima de 0,25 — verifique se é adequada para UHPC
              </p>
            )}
          </div>
        </section>

        {/* ── Parâmetros de cura ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Parâmetros de Cura</h2>
          <p className={styles.sectionHint}>
            Faixas ideais de temperatura e umidade dentro da câmara. O sistema compara
            as leituras do DHT22 com esses valores para calcular conformidade.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Temperatura mínima (°C)</label>
              <input
                className={`form-input ${erros.temperaturaIdealMin ? styles.inputError : ""}`}
                type="number" min={0} max={60} step={0.5}
                value={form.temperaturaIdealMin}
                onChange={(e) => set("temperaturaIdealMin", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Temperatura máxima (°C)</label>
              <input
                className={`form-input ${erros.temperaturaIdealMax ? styles.inputError : ""}`}
                type="number" min={0} max={60} step={0.5}
                value={form.temperaturaIdealMax}
                onChange={(e) => set("temperaturaIdealMax", e.target.value)}
              />
              {erros.temperaturaIdealMax && (
                <span className={styles.erro}>{erros.temperaturaIdealMax}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Umidade mínima (%)</label>
              <input
                className={`form-input ${erros.umidadeIdealMin ? styles.inputError : ""}`}
                type="number" min={0} max={100} step={1}
                value={form.umidadeIdealMin}
                onChange={(e) => set("umidadeIdealMin", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Umidade máxima (%)</label>
              <input
                className={`form-input ${erros.umidadeIdealMax ? styles.inputError : ""}`}
                type="number" min={0} max={100} step={1}
                value={form.umidadeIdealMax}
                onChange={(e) => set("umidadeIdealMax", e.target.value)}
              />
              {erros.umidadeIdealMax && (
                <span className={styles.erro}>{erros.umidadeIdealMax}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Modo de controle padrão</label>
            <select
              className="form-select"
              value={form.modoControle}
              onChange={(e) => set("modoControle", e.target.value as ModoControle)}
            >
              <option value="automatico">Automático — bomba acionada pelo ESP32</option>
              <option value="manual">Manual — bomba acionada pelo Dashboard</option>
            </select>
          </div>
        </section>

        {/* ── Regra de irrigação ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Regra de Irrigação</h2>
          <p className={styles.sectionHint}>
            Define como a microbomba será acionada. O volume por acionamento é calculado
            automaticamente a partir da vazão calibrada.
          </p>

          <div className={styles.dosagemGrid}>
            <div className="form-group">
              <label className="form-label">Vazão calibrada (ml/s) *</label>
              <input
                className={`form-input ${erros.vazaoMlPorSegundo ? styles.inputError : ""}`}
                type="number" min={0.1} step={0.1}
                value={form.vazaoMlPorSegundo}
                onChange={(e) => set("vazaoMlPorSegundo", e.target.value)}
              />
              {erros.vazaoMlPorSegundo && (
                <span className={styles.erro}>{erros.vazaoMlPorSegundo}</span>
              )}
              <span className="form-hint">Medir com proveta antes de calibrar</span>
            </div>
            <div className="form-group">
              <label className="form-label">Volume por acionamento (ml)</label>
              <input
                className="form-input"
                type="number" min={1} step={0.5}
                value={form.mlPorAcionamento}
                onChange={(e) => set("mlPorAcionamento", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duração do acionamento (s)</label>
              <input
                className="form-input"
                type="text"
                readOnly
                value={duracaoCalculada !== null ? `${duracaoCalculada}s (calculado)` : "—"}
                style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}
              />
              <span className="form-hint">volume ÷ vazão — calculado automaticamente</span>
            </div>
            <div className="form-group">
              <label className="form-label">Intervalo mínimo (min)</label>
              <input
                className="form-input"
                type="number" min={1} step={1}
                value={form.intervaloMinutos}
                onChange={(e) => set("intervaloMinutos", e.target.value)}
              />
              <span className="form-hint">Tempo mínimo entre acionamentos</span>
            </div>
            <div className="form-group">
              <label className="form-label">Limiar de umidade para irrigação (%)</label>
              <input
                className="form-input"
                type="number" min={0} max={100} step={1}
                value={form.umidadeMinima}
                onChange={(e) => set("umidadeMinima", e.target.value)}
              />
              <span className="form-hint">Modo automático: irriga se umidade cair abaixo deste valor</span>
            </div>
          </div>
        </section>

        {/* ── Ambiente e observações ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Ambiente e Observações</h2>
          <div className="form-group">
            <label className="form-label">Ambiente de cura</label>
            <select
              className="form-select"
              value={form.ambienteCura}
              onChange={(e) => set("ambienteCura", e.target.value as AmbienteCura)}
            >
              {AMBIENTES.map((a) => (
                <option key={a} value={a}>{labelAmbienteCura(a)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Notas sobre o processo, cuidados especiais..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </section>

        {/* ── Ações ── */}
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar Receita"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
