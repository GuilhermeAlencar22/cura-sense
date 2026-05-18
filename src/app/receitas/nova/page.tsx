"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { salvarReceita } from "@/services/receitasService";
import { TipoPeca, TipoConcreto, ReceitaTraco } from "@/types";
import { calcularRelacoes } from "@/utils/calcularRelacoes";
import { labelTipoPeca, labelTipoConcreto, labelAmbienteCura } from "@/utils/formatters";
import styles from "./nova.module.css";

type AmbienteCura = ReceitaTraco["ambienteCura"];

const TIPOS_PECA: TipoPeca[] = ["cuba_colorida", "escalda_pes", "pia_gourmet", "bancada", "vaso", "outro"];
const TIPOS_CONCRETO: TipoConcreto[] = ["uhpc", "convencional", "armado", "alta_resistencia"];
const AMBIENTES: AmbienteCura[] = ["tanque_submerso", "camara_umida", "exposto"];

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
};

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
  ambienteCura: "tanque_submerso",
  observacoes: "",
};

function parseGramas(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

export default function NovaReceitaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});

  const relacoes = useMemo(() => {
    const cimento = parseGramas(form.massaCimento);
    const agregado = parseGramas(form.massaAgregado);
    const agua = parseGramas(form.massaAgua);
    if (cimento === 0 && agua === 0) return null;
    return calcularRelacoes({ massaCimento: cimento, massaAgregado: agregado, massaAgua: agua });
  }, [form.massaCimento, form.massaAgregado, form.massaAgua]);

  function set(campo: keyof FormState, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function validar(): boolean {
    const novosErros: Partial<Record<keyof FormState, string>> = {};
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (parseGramas(form.massaCimento) === 0) novosErros.massaCimento = "Informe a massa de cimento";
    if (parseGramas(form.massaAgregado) === 0) novosErros.massaAgregado = "Informe a massa de agregado";
    if (parseGramas(form.massaAgua) === 0) novosErros.massaAgua = "Informe a massa de água";
    const dias = parseInt(form.diasCura);
    if (isNaN(dias) || dias < 1) novosErros.diasCura = "Mínimo 1 dia";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSalvando(true);

    const cimento = parseGramas(form.massaCimento);
    const agregado = parseGramas(form.massaAgregado);
    const agua = parseGramas(form.massaAgua);
    const rels = calcularRelacoes({ massaCimento: cimento, massaAgregado: agregado, massaAgua: agua });

    salvarReceita({
      nome: form.nome.trim(),
      tipoPeca: form.tipoPeca,
      tipoConcreto: form.tipoConcreto,
      massaCimento: cimento,
      massaAgregado: agregado,
      massaPigmento: parseGramas(form.massaPigmento),
      massaAditivos: parseGramas(form.massaAditivos),
      massaAgua: agua,
      relacaoAguaCimento: rels.relacaoAguaCimento,
      relacaoMassaAgregado: rels.relacaoMassaAgregado,
      diasCura: parseInt(form.diasCura),
      ambienteCura: form.ambienteCura,
      observacoes: form.observacoes.trim(),
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
          <p className="page-subtitle">Defina o traço padrão para uma peça de concreto UHPC</p>
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
              <span className="form-hint">Padrão UHPC: 7 dias em tanque submerso</span>
            </div>
          </div>
        </section>

        {/* ── Dosagem ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Dosagem Padrão</h2>
          <p className={styles.sectionHint}>
            Informe a dosagem de referência para este traço. Todos os lotes produzidos serão comparados com esses valores.
          </p>

          <div className={styles.dosagemGrid}>
            <div className="form-group">
              <label className="form-label">Cimento (g) *</label>
              <input
                className={`form-input ${erros.massaCimento ? styles.inputError : ""}`}
                type="number"
                min={0}
                step={0.1}
                placeholder="0"
                value={form.massaCimento}
                onChange={(e) => set("massaCimento", e.target.value)}
              />
              {erros.massaCimento && <span className={styles.erro}>{erros.massaCimento}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Agregado (g) *</label>
              <input
                className={`form-input ${erros.massaAgregado ? styles.inputError : ""}`}
                type="number"
                min={0}
                step={0.1}
                placeholder="0"
                value={form.massaAgregado}
                onChange={(e) => set("massaAgregado", e.target.value)}
              />
              {erros.massaAgregado && <span className={styles.erro}>{erros.massaAgregado}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Água (g) *</label>
              <input
                className={`form-input ${erros.massaAgua ? styles.inputError : ""}`}
                type="number"
                min={0}
                step={0.1}
                placeholder="0"
                value={form.massaAgua}
                onChange={(e) => set("massaAgua", e.target.value)}
              />
              {erros.massaAgua && <span className={styles.erro}>{erros.massaAgua}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Pigmento (g)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                step={0.1}
                placeholder="0"
                value={form.massaPigmento}
                onChange={(e) => set("massaPigmento", e.target.value)}
              />
              <span className="form-hint">Opcional — influencia cor da peça</span>
            </div>
            <div className="form-group">
              <label className="form-label">Aditivos (g)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                step={0.1}
                placeholder="0"
                value={form.massaAditivos}
                onChange={(e) => set("massaAditivos", e.target.value)}
              />
            </div>
          </div>

          {/* Relações calculadas */}
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

        {/* ── Cura ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Ambiente de Cura</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ambiente</label>
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
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Notas sobre o processo, cuidados especiais, variações aceitas..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </section>

        {/* ── Ações ── */}
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
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
