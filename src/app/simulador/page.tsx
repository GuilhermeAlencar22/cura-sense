"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { listarCuras, atualizarCura, registrarLeitura } from "@/services/curasService";
import { buscarReceita } from "@/services/receitasService";
import { calcularAguaPorCiclo } from "@/utils/calcularAguaPorCiclo";
import { Cura, Receita, ResultadoCalculo } from "@/types";
import styles from "./simulador.module.css";

export default function SimuladorPage() {
  const [curas, setCuras] = useState<Cura[]>([]);
  const [curaSelecionada, setCuraSelecionada] = useState<Cura | null>(null);
  const [receita, setReceita] = useState<Receita | null>(null);
  const [temperatura, setTemperatura] = useState(25);
  const [umidade, setUmidade] = useState(70);
  const [bombaAtiva, setBombaAtiva] = useState(false);
  const [calculo, setCalculo] = useState<ResultadoCalculo | null>(null);
  const [ultimaAplicacao, setUltimaAplicacao] = useState<string | null>(null);

  function recarregar() {
    const lista = listarCuras().filter((c) => c.status !== "finalizada");
    setCuras(lista);
  }

  useEffect(() => {
    recarregar();
  }, []);

  function selecionar(cura: Cura) {
    setCuraSelecionada(cura);
    setTemperatura(cura.temperaturaAtual);
    setUmidade(cura.umidadeAtual);
    setBombaAtiva(false);
    setUltimaAplicacao(null);
    const r = buscarReceita(cura.receitaId);
    setReceita(r ?? null);
    if (r) {
      setCalculo(
        calcularAguaPorCiclo({
          aguaBaseMl: r.aguaBaseMl,
          vazaoBombaMlSegundo: r.vazaoBombaMlSegundo,
          temperatura: cura.temperaturaAtual,
          umidade: cura.umidadeAtual,
        })
      );
    }
  }

  function handleTemperatura(val: number) {
    setTemperatura(val);
    if (receita) {
      setCalculo(
        calcularAguaPorCiclo({
          aguaBaseMl: receita.aguaBaseMl,
          vazaoBombaMlSegundo: receita.vazaoBombaMlSegundo,
          temperatura: val,
          umidade,
        })
      );
    }
  }

  function handleUmidade(val: number) {
    setUmidade(val);
    if (receita) {
      setCalculo(
        calcularAguaPorCiclo({
          aguaBaseMl: receita.aguaBaseMl,
          vazaoBombaMlSegundo: receita.vazaoBombaMlSegundo,
          temperatura,
          umidade: val,
        })
      );
    }
  }

  function aplicar() {
    if (!curaSelecionada || !calculo) return;

    atualizarCura(curaSelecionada.id, {
      temperaturaAtual: temperatura,
      umidadeAtual: umidade,
      status: temperatura > 30 || umidade < 60 ? "alerta" : "ativa",
    });

    registrarLeitura(curaSelecionada.id, {
      temperatura,
      umidade,
      aguaAplicadaMl: bombaAtiva ? calculo.aguaPorCicloMl : 0,
      bombaAcionada: bombaAtiva,
      dataHora: new Date().toISOString(),
    });

    setUltimaAplicacao(
      `${new Date().toLocaleTimeString("pt-BR")} — ${bombaAtiva ? `${calculo.aguaPorCicloMl} ml aplicados` : "leitura sem bomba"}`
    );
    recarregar();
  }

  return (
    <AppShell>
      <h1 className="page-title">Simulador de Sensores</h1>
      <p className="page-subtitle">
        Selecione uma cura ativa e altere temperatura, umidade e status da bomba.
      </p>

      <div className={styles.layout}>
        {/* Lista de curas */}
        <div className={styles.lista}>
          <p className={styles.listaTitle}>Curas ativas</p>
          {curas.length === 0 && (
            <p className={styles.empty}>Nenhuma cura ativa.</p>
          )}
          {curas.map((c) => (
            <button
              key={c.id}
              className={`${styles.curaItem} ${curaSelecionada?.id === c.id ? styles.curaItemAtiva : ""}`}
              onClick={() => selecionar(c)}
            >
              <p className={styles.curaItemNome}>{c.nomeIdentificacao}</p>
              <StatusBadge status={c.status} />
            </button>
          ))}
        </div>

        {/* Painel principal */}
        <div className={styles.painel}>
          {!curaSelecionada ? (
            <div className={styles.vazio}>
              <span style={{ fontSize: "3rem" }}>◉</span>
              <p>Selecione uma cura para simular</p>
            </div>
          ) : (
            <>
              <div className={styles.painelHeader}>
                <div>
                  <h2 className={styles.painelTitulo}>{curaSelecionada.nomeIdentificacao}</h2>
                  {receita && <p className={styles.painelSub}>{receita.nome}</p>}
                </div>
                <StatusBadge status={curaSelecionada.status} />
              </div>

              {/* Temperatura */}
              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>🌡</span>
                  <span className={styles.controleLabel}>Temperatura</span>
                  <span className={`${styles.controleValor} ${temperatura > 30 ? styles.danger : ""}`}>
                    {temperatura}°C
                  </span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={0} max={55} value={temperatura}
                  onChange={(e) => handleTemperatura(Number(e.target.value))}
                />
                <div className={styles.sliderLabels}>
                  <span>0°C (frio)</span>
                  <span>24–30°C (normal)</span>
                  <span>+30°C (calor)</span>
                </div>
              </div>

              {/* Umidade */}
              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>💧</span>
                  <span className={styles.controleLabel}>Umidade</span>
                  <span className={`${styles.controleValor} ${umidade < 60 ? styles.warning : ""}`}>
                    {umidade}%
                  </span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={0} max={100} value={umidade}
                  onChange={(e) => handleUmidade(Number(e.target.value))}
                />
                <div className={styles.sliderLabels}>
                  <span>&lt;60% (baixa ×1.4)</span>
                  <span>60–80% (normal ×1.0)</span>
                  <span>&gt;80% (alta ×0.6)</span>
                </div>
              </div>

              {/* Bomba */}
              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>⚙</span>
                  <span className={styles.controleLabel}>Status da bomba</span>
                  <button
                    className={`btn btn-sm ${bombaAtiva ? "btn-danger" : "btn-success"}`}
                    onClick={() => setBombaAtiva(!bombaAtiva)}
                  >
                    {bombaAtiva ? "Desligar" : "Ligar"}
                  </button>
                </div>
                <div className={`${styles.bombaStatus} ${bombaAtiva ? styles.bombaOn : styles.bombaOff}`}>
                  {bombaAtiva
                    ? "🟢 Bomba ligada — água será registrada neste ciclo"
                    : "⚪ Bomba desligada — apenas leitura de sensores"}
                </div>
              </div>

              {/* Resultado do cálculo */}
              {calculo && (
                <div className={styles.resultado}>
                  <p className={styles.resultadoTitle}>Resultado do cálculo atual</p>
                  <div className={styles.resultadoGrid}>
                    <div className={styles.resultadoItem}>
                      <span>Fator umidade</span>
                      <strong>×{calculo.fatorUmidade}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Fator temperatura</span>
                      <strong>×{calculo.fatorTemperatura}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Água por ciclo</span>
                      <strong className={styles.destaque}>{calculo.aguaPorCicloMl} ml</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Tempo bomba</span>
                      <strong>{calculo.tempoBombaSegundos}s</strong>
                    </div>
                  </div>
                </div>
              )}

              {ultimaAplicacao && (
                <div className={styles.feedback}>
                  ✓ {ultimaAplicacao}
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 20 }}
                onClick={aplicar}
              >
                ⟳ Aplicar simulação
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
