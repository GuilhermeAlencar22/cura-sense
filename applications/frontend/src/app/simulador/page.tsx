"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { listarCurasAtivas, registrarLeitura } from "@/services/curasService";
import { buscarLote } from "@/services/lotesService";
import { CuraLote } from "@/types";
import styles from "./simulador.module.css";

export default function SimuladorPage() {
  const [curas, setCuras] = useState<CuraLote[]>([]);
  const [selecionada, setSelecionada] = useState<CuraLote | null>(null);
  const [tempTanque, setTempTanque] = useState(22);
  const [tempAmbiente, setTempAmbiente] = useState(25);
  const [nivel, setNivel] = useState<"ok" | "baixo" | "critico">("ok");
  const [ultimaLeitura, setUltimaLeitura] = useState<string | null>(null);

  function recarregar() {
    const lista = listarCurasAtivas();
    setCuras(lista);
  }

  useEffect(() => {
    recarregar();
  }, []);

  function selecionar(cura: CuraLote) {
    setSelecionada(cura);
    setTempTanque(cura.temperaturaTanque ?? 22);
    setTempAmbiente(cura.temperaturaAmbiente ?? 25);
    setNivel(cura.nivelAguaTanque ?? "ok");
    setUltimaLeitura(null);
  }

  function aplicar() {
    if (!selecionada) return;
    registrarLeitura(selecionada.id, {
      temperaturaTanque: tempTanque,
      temperaturaAmbiente: tempAmbiente,
      nivelAguaTanque: nivel,
      dataHora: new Date().toISOString(),
    });
    setUltimaLeitura(new Date().toLocaleTimeString("pt-BR"));
    recarregar();
  }

  return (
    <AppShell>
      <h1 className="page-title">Simulador de Sensores</h1>
      <p className="page-subtitle">
        Simule leituras do ESP32: temperatura do tanque, temperatura ambiente e nível da água.
      </p>

      <div className={styles.layout}>
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
                <p className={styles.curaItemNome}>{lote?.nomeIdentificacao ?? c.loteId}</p>
                <StatusBadge status={c.status} />
              </button>
            );
          })}
        </div>

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
                  {buscarLote(selecionada.loteId)?.nomeIdentificacao ?? selecionada.loteId}
                </h2>
                <StatusBadge status={selecionada.status} />
              </div>

              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>🌡</span>
                  <span className={styles.controleLabel}>Temperatura do tanque</span>
                  <span className={styles.controleValor}>{tempTanque}°C</span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={0} max={50} value={tempTanque}
                  onChange={(e) => setTempTanque(Number(e.target.value))}
                />
              </div>

              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>🌡</span>
                  <span className={styles.controleLabel}>Temperatura ambiente</span>
                  <span className={styles.controleValor}>{tempAmbiente}°C</span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={0} max={55} value={tempAmbiente}
                  onChange={(e) => setTempAmbiente(Number(e.target.value))}
                />
              </div>

              <div className={styles.controle}>
                <div className={styles.controleHeader}>
                  <span>💧</span>
                  <span className={styles.controleLabel}>Nível da água no tanque</span>
                </div>
                <div className={styles.nivelBtns}>
                  {(["ok", "baixo", "critico"] as const).map((n) => (
                    <button
                      key={n}
                      className={`btn btn-sm ${nivel === n ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setNivel(n)}
                    >
                      {n === "ok" ? "OK" : n === "baixo" ? "Baixo" : "Crítico"}
                    </button>
                  ))}
                </div>
              </div>

              {ultimaLeitura && (
                <div className={styles.feedback}>
                  ✓ Leitura registrada às {ultimaLeitura}
                </div>
              )}

              <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={aplicar}>
                ⟳ Registrar leitura
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
