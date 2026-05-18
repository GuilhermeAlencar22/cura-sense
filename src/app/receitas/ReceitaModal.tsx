"use client";

import { useState, FormEvent } from "react";
import { Receita, TipoConcreto, TipoPeca } from "@/types";
import styles from "./ReceitaModal.module.css";

type Props = {
  receita?: Receita;
  onSalvar: (dados: Omit<Receita, "id" | "criadaEm">, id?: string) => void;
  onFechar: () => void;
};

const FORM_VAZIO: Omit<Receita, "id" | "criadaEm"> = {
  nome: "",
  tipoPeca: "bancada",
  tipoConcreto: "convencional",
  volumeM3: 0.05,
  objetivoFinal: "",
  diasCura: 28,
  aguaBaseMl: 500,
  vazaoBombaMlSegundo: 5,
};

const TIPOS_PECA: TipoPeca[] = ["pia", "vaso", "bancada", "pilar", "laje", "outro"];
const TIPOS_CONCRETO: TipoConcreto[] = [
  "convencional", "armado", "usinado", "bombeavel",
  "protendido", "alta_resistencia", "leve", "autoadensavel",
];
const LABEL_CONCRETO: Record<TipoConcreto, string> = {
  convencional: "Convencional",
  armado: "Armado",
  usinado: "Usinado",
  bombeavel: "Bombeável",
  protendido: "Protendido",
  alta_resistencia: "Alta Resistência",
  leve: "Leve",
  autoadensavel: "Autoadensável",
};
const LABEL_PECA: Record<TipoPeca, string> = {
  pia: "Pia", vaso: "Vaso", bancada: "Bancada",
  pilar: "Pilar", laje: "Laje", outro: "Outro",
};

export default function ReceitaModal({ receita, onSalvar, onFechar }: Props) {
  const [form, setForm] = useState<Omit<Receita, "id" | "criadaEm">>(
    receita
      ? { nome: receita.nome, tipoPeca: receita.tipoPeca, tipoConcreto: receita.tipoConcreto,
          volumeM3: receita.volumeM3, objetivoFinal: receita.objetivoFinal,
          diasCura: receita.diasCura, aguaBaseMl: receita.aguaBaseMl,
          vazaoBombaMlSegundo: receita.vazaoBombaMlSegundo }
      : FORM_VAZIO
  );

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSalvar(form, receita?.id);
  }

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{receita ? "Editar Receita" : "Nova Receita"}</h2>
          <button className={styles.closeBtn} onClick={onFechar}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label">Nome da receita</label>
            <input
              className="form-input"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex: Cura Intensa Pilar R$50"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo da peça</label>
              <select
                className="form-select"
                value={form.tipoPeca}
                onChange={(e) => set("tipoPeca", e.target.value as TipoPeca)}
              >
                {TIPOS_PECA.map((t) => (
                  <option key={t} value={t}>{LABEL_PECA[t]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de concreto</label>
              <select
                className="form-select"
                value={form.tipoConcreto}
                onChange={(e) => set("tipoConcreto", e.target.value as TipoConcreto)}
              >
                {TIPOS_CONCRETO.map((t) => (
                  <option key={t} value={t}>{LABEL_CONCRETO[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Objetivo final</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={form.objetivoFinal}
              onChange={(e) => set("objetivoFinal", e.target.value)}
              placeholder="Ex: Resistência mínima de 25 MPa após 28 dias"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Volume aproximado (m³)</label>
              <input
                className="form-input"
                type="number"
                step="0.001"
                min={0.001}
                value={form.volumeM3}
                onChange={(e) => set("volumeM3", Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Dias de cura</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.diasCura}
                onChange={(e) => set("diasCura", Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Água base por ciclo (ml)</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.aguaBaseMl}
                onChange={(e) => set("aguaBaseMl", Number(e.target.value))}
                required
              />
              <p className="form-hint">Volume sem fatores de ajuste</p>
            </div>
            <div className="form-group">
              <label className="form-label">Vazão da bomba (ml/s)</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                min={0.1}
                value={form.vazaoBombaMlSegundo}
                onChange={(e) => set("vazaoBombaMlSegundo", Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className="btn btn-secondary" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
