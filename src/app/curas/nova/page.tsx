"use client";

import { useEffect, useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { iniciarCura } from "@/services/curasService";
import { listarReceitas, buscarReceita } from "@/services/receitasService";
import { calcularAguaPorCiclo } from "@/utils/calcularAguaPorCiclo";
import { labelTipoConcreto, labelTipoPeca } from "@/utils/formatters";
import { Receita } from "@/types";
import styles from "./nova.module.css";

function NovaCuraForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receitaIdParam = searchParams.get("receitaId") ?? "";

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [receitaId, setReceitaId] = useState(receitaIdParam);
  const [nome, setNome] = useState("");
  const [temperatura, setTemperatura] = useState(25);
  const [umidade, setUmidade] = useState(70);

  useEffect(() => {
    const lista = listarReceitas();
    setReceitas(lista);
    if (!receitaId && lista.length > 0) setReceitaId(lista[0].id);
  }, []);

  const receitaSelecionada = buscarReceita(receitaId);
  const previa = receitaSelecionada
    ? calcularAguaPorCiclo({
        aguaBaseMl: receitaSelecionada.aguaBaseMl,
        vazaoBombaMlSegundo: receitaSelecionada.vazaoBombaMlSegundo,
        temperatura,
        umidade,
      })
    : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!receitaId) return;
    const cura = iniciarCura(receitaId, nome || `Cura — ${receitaSelecionada?.nome ?? receitaId}`, temperatura, umidade);
    router.push(`/curas/${cura.id}`);
  }

  return (
    <AppShell>
      <div className={styles.back}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
          ← Voltar
        </button>
      </div>

      <h1 className="page-title">Iniciar Cura</h1>
      <p className="page-subtitle">Selecione uma receita e defina as condições iniciais.</p>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Receita</label>
              <select
                className="form-select"
                value={receitaId}
                onChange={(e) => setReceitaId(e.target.value)}
                required
              >
                {receitas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nome / identificação desta cura</label>
              <input
                className="form-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Lote A — Bancada da oficina"
              />
              <p className="form-hint">Opcional. Ajuda a diferenciar curas da mesma receita.</p>
            </div>

            <div className="form-group">
              <label className="form-label">
                Temperatura inicial simulada: <strong>{temperatura}°C</strong>
              </label>
              <input
                type="range"
                className={styles.slider}
                min={0}
                max={55}
                value={temperatura}
                onChange={(e) => setTemperatura(Number(e.target.value))}
              />
              <div className={styles.sliderLabels}>
                <span>0°C</span><span>27°C</span><span>55°C</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Umidade inicial simulada: <strong>{umidade}%</strong>
              </label>
              <input
                type="range"
                className={styles.slider}
                min={0}
                max={100}
                value={umidade}
                onChange={(e) => setUmidade(Number(e.target.value))}
              />
              <div className={styles.sliderLabels}>
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={!receitaId}>
                ▶ Iniciar Cura
              </button>
            </div>
          </form>
        </div>

        {/* Prévia do cálculo */}
        {receitaSelecionada && previa && (
          <div className={styles.preview}>
            <h3 className={styles.previewTitle}>Prévia do cálculo</h3>

            <div className={styles.receitaInfo}>
              <div className={styles.infoRow}>
                <span>Tipo de peça</span>
                <strong>{labelTipoPeca(receitaSelecionada.tipoPeca)}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Tipo de concreto</span>
                <strong>{labelTipoConcreto(receitaSelecionada.tipoConcreto)}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Volume</span>
                <strong>{receitaSelecionada.volumeM3} m³</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Dias de cura</span>
                <strong>{receitaSelecionada.diasCura} dias</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Água base/ciclo</span>
                <strong>{receitaSelecionada.aguaBaseMl} ml</strong>
              </div>
            </div>

            <div className={styles.calculoBox}>
              <p className={styles.calculoLabel}>Com as condições iniciais definidas:</p>
              <div className={styles.calculoGrid}>
                <div className={styles.calculoItem}>
                  <span>Fator umidade</span>
                  <strong>×{previa.fatorUmidade}</strong>
                </div>
                <div className={styles.calculoItem}>
                  <span>Fator temperatura</span>
                  <strong>×{previa.fatorTemperatura}</strong>
                </div>
                <div className={styles.calculoItem}>
                  <span>Água por ciclo</span>
                  <strong className={styles.destaque}>{previa.aguaPorCicloMl} ml</strong>
                </div>
                <div className={styles.calculoItem}>
                  <span>Tempo bomba</span>
                  <strong>{previa.tempoBombaSegundos}s</strong>
                </div>
              </div>
            </div>

            {receitaSelecionada.objetivoFinal && (
              <div className={styles.objetivo}>
                <p className={styles.objetivoLabel}>Objetivo final</p>
                <p className={styles.objetivoText}>{receitaSelecionada.objetivoFinal}</p>
              </div>
            )}
          </div>
        )}
      </div>
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
