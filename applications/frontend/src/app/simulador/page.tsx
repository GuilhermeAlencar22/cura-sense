"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import {
  listarCurasAtivas,
  registrarLeitura,
  registrarIrrigacao,
} from "@/services/curasService";
import { buscarLote } from "@/services/lotesService";
import { CuraLote, EstadoBomba } from "@/types";
import {
  avaliarLeitura,
  labelConformidadeTelemetria,
} from "@/utils/calcularConformidadeTelemetria";
import styles from "./simulador.module.css";

export default function SimuladorPage() {
  const [curas, setCuras] = useState<CuraLote[]>([]);
  const [selecionada, setSelecionada] = useState<CuraLote | null>(null);

  // Controles dos sensores
  const [temperatura, setTemperatura] = useState(22);
  const [umidade, setUmidade] = useState(88);
  const [estadoBomba, setEstadoBomba] = useState<EstadoBomba>("desligada");

  // Feedback visual
  const [ultimaLeitura, setUltimaLeitura] = useState<string | null>(null);
  const [ultimaIrrigacao, setUltimaIrrigacao] = useState<string | null>(null);

  function recarregar() {
    const lista = listarCurasAtivas();
    setCuras(lista);
  }

  useEffect(() => {
    recarregar();
  }, []);

  function selecionar(cura: CuraLote) {
    setSelecionada(cura);
    setTemperatura(cura.temperaturaAtual ?? 22);
    setUmidade(cura.umidadeAtual ?? 88);
    setEstadoBomba(cura.estadoBomba);
    setUltimaLeitura(null);
    setUltimaIrrigacao(null);
  }

  function aplicarLeitura() {
    if (!selecionada) return;
    registrarLeitura(selecionada.id, { temperatura, umidade, estadoBomba });
    setUltimaLeitura(new Date().toLocaleTimeString("pt-BR"));
    recarregar();
  }

  function acionarBomba() {
    if (!selecionada) return;
    const regra = selecionada.parametros.regraIrrigacao;
    const novoEstado: EstadoBomba =
      estadoBomba === "desligada" ? "ligada" : "desligada";
    setEstadoBomba(novoEstado);

    // Registra leitura com novo estado da bomba
    registrarLeitura(selecionada.id, {
      temperatura,
      umidade,
      estadoBomba: novoEstado,
    });

    // Se ligou, registra evento de irrigação
    if (novoEstado === "ligada") {
      registrarIrrigacao(selecionada.id, {
        duracaoSegundos: regra.duracaoSegundos,
        volumeEstimadoMl: regra.mlPorAcionamento,
        origem: "manual",
      });
      setUltimaIrrigacao(
        `${regra.mlPorAcionamento} ml · ${regra.duracaoSegundos}s · manual`
      );
    }

    setUltimaLeitura(new Date().toLocaleTimeString("pt-BR"));
    recarregar();
  }

  // Conformidade em tempo real com base nos parâmetros da cura selecionada
  const conformidade =
    selecionada
      ? avaliarLeitura(temperatura, umidade, selecionada.parametros)
      : null;

  function corConformidade(s: string) {
    if (s === "conforme") return styles.conforme;
    if (s === "desvio_leve") return styles.desvioLeve;
    if (s === "desvio_critico") return styles.desvioCritico;
    return "";
  }

  return (
    <AppShell>
      <h1 className="page-title">Simulador de Sensores</h1>
      <p className="page-subtitle">
        Simule leituras do ESP32: temperatura, umidade e controle da bomba.
        Os valores são comparados em tempo real com os parâmetros ideais da receita.
      </p>

      <div className={styles.layout}>
        {/* ── Lista de curas ativas ──────────────────────────────────────── */}
        <div className={styles.lista}>
          <p className={styles.listaTitle}>Curas ativas</p>
          {curas.length === 0 && (
            <p className={styles.empty}>Nenhuma cura ativa.</p>
          )}
          {curas.map((c) => {
            const lote = buscarLote(c.loteId);
            return (
              <button
                key={c.id}
                className={`${styles.curaItem} ${selecionada?.id === c.id ? styles.curaItemAtiva : ""}`}
                onClick={() => selecionar(c)}
              >
                <p className={styles.curaItemNome}>
                  {lote?.nomeIdentificacao ?? c.loteId}
                </p>
                <StatusBadge status={c.status} />
              </button>
            );
          })}
        </div>

        {/* ── Painel de controle ─────────────────────────────────────────── */}
        <div className={styles.painel}>
          {!selecionada ? (
            <div className={styles.vazio}>
              <span style={{ fontSize: "3rem" }}>◉</span>
              <p>Selecione uma cura para simular leituras</p>
            </div>
          ) : (
            <>
              <div className={styles.painelHeader}>
                <h2 className={styles.painelTitulo}>
                  {buscarLote(selecionada.loteId)?.nomeIdentificacao ??
                    selecionada.loteId}
                </h2>
                <StatusBadge status={selecionada.status} />
              </div>

              {/* Parâmetros ideais da receita */}
              <div className={styles.parametrosBox}>
                <p className={styles.parametrosTitle}>Parâmetros ideais (receita)</p>
                <div className={styles.parametrosGrid}>
                  <div className={styles.parametroItem}>
                    <span>Temperatura</span>
                    <strong>
                      {selecionada.parametros.temperaturaIdealMin}–
                      {selecionada.parametros.temperaturaIdealMax}°C
                    </strong>
                  </div>
                  <div className={styles.parametroItem}>
                    <span>Umidade</span>
                    <strong>
                      {selecionada.parametros.umidadeIdealMin}–
                      {selecionada.parametros.umidadeIdealMax}%
                    </strong>
                  </div>
                  <div className={styles.parametroItem}>
                    <span>Modo</span>
                    <strong>
                      {selecionada.parametros.modoControle === "automatico"
                        ? "Automático"
                        : "Manual"}
                    </strong>
                  </div>
                  <div className={styles.parametroItem}>
                    <span>Vol./acionamento</span>
                    <strong>
                      {selecionada.parametros.regraIrrigacao.mlPorAcionamento} ml
                    </strong>
                  </div>
                </div>
              </div>

              {/* Conformidade em tempo real */}
              {conformidade && (
                <div className={`${styles.conformidadeBox} ${corConformidade(conformidade.geral)}`}>
                  <span className={styles.conformidadeGeral}>
                    {labelConformidadeTelemetria(conformidade.geral)}
                  </span>
                  <div className={styles.conformidadeDetalhe}>
                    <span>
                      Temperatura: {labelConformidadeTelemetria(conformidade.temperatura)}
                    </span>
                    <span>
                      Umidade: {labelConformidadeTelemetria(conformidade.umidade)}
                    </span>
                  </div>
                </div>
              )}

              {/* Slider: Temperatura */}
              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>🌡</span>
                  <span className={styles.controleLabel}>Temperatura da câmara</span>
                  <span className={`${styles.controleValor} ${corConformidade(conformidade?.temperatura ?? "sem_dados")}`}>
                    {temperatura}°C
                  </span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={50}
                  value={temperatura}
                  onChange={(e) => setTemperatura(Number(e.target.value))}
                />
                <div className={styles.sliderLabels}>
                  <span>0°C</span>
                  <span>50°C</span>
                </div>
              </div>

              {/* Slider: Umidade */}
              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>💧</span>
                  <span className={styles.controleLabel}>Umidade relativa</span>
                  <span className={`${styles.controleValor} ${corConformidade(conformidade?.umidade ?? "sem_dados")}`}>
                    {umidade}%
                  </span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={100}
                  value={umidade}
                  onChange={(e) => setUmidade(Number(e.target.value))}
                />
                <div className={styles.sliderLabels}>
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Controle da bomba */}
              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>⚙</span>
                  <span className={styles.controleLabel}>Microbomba</span>
                  <span
                    className={`${styles.controleValor} ${estadoBomba === "ligada" ? styles.bombaLigada : styles.bombaDesligada}`}
                  >
                    {estadoBomba === "ligada" ? "LIGADA" : "DESLIGADA"}
                  </span>
                </div>
                <button
                  className={`btn btn-full ${estadoBomba === "ligada" ? "btn-danger" : "btn-secondary"}`}
                  onClick={acionarBomba}
                  style={{ marginTop: 8 }}
                >
                  {estadoBomba === "ligada"
                    ? "⬛ Desligar bomba"
                    : "▶ Acionar bomba (manual)"}
                </button>
                {ultimaIrrigacao && (
                  <p className={styles.feedbackIrrigacao}>
                    Último acionamento: {ultimaIrrigacao}
                  </p>
                )}
              </div>

              {/* Feedback e botão principal */}
              {ultimaLeitura && (
                <div className={styles.feedback}>
                  ✓ Leitura registrada às {ultimaLeitura}
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 16 }}
                onClick={aplicarLeitura}
              >
                ⟳ Registrar leitura
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
