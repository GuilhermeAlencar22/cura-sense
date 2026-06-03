"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { listarCuras } from "@/services/curasService";
import { buscarLote } from "@/services/lotesService";
import { formatarData } from "@/utils/formatters";
import {
  avaliarLeitura,
  labelConformidadeTelemetria,
} from "@/utils/calcularConformidadeTelemetria";
import { CuraLote, LeituraCamara } from "@/types";
import styles from "./historico.module.css";

type LeituraEnriquecida = LeituraCamara & {
  curaNome: string;
  curaId: string;
  conformidadeGeral: string;
};

export default function HistoricoPage() {
  const [leituras, setLeituras] = useState<LeituraEnriquecida[]>([]);
  const [filtroCura, setFiltroCura] = useState("");
  const [curas, setCuras] = useState<CuraLote[]>([]);

  useEffect(() => {
    const todasCuras = listarCuras();
    setCuras(todasCuras);

    const todas: LeituraEnriquecida[] = todasCuras.flatMap((c) => {
      const lote = buscarLote(c.loteId);
      return c.historico.map((h) => {
        const conf = avaliarLeitura(h.temperatura, h.umidade, c.parametros);
        return {
          ...h,
          curaNome: lote?.nomeIdentificacao ?? c.loteId,
          curaId: c.id,
          conformidadeGeral: conf.geral,
        };
      });
    });

    todas.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLeituras(todas);
  }, []);

  const leiturasExibidas = filtroCura
    ? leituras.filter((l) => l.curaId === filtroCura)
    : leituras;

  const totalVolume = leiturasExibidas
    .filter((l) => l.estadoBomba === "ligada")
    .length; // proxy: contagem de leituras com bomba ligada

  return (
    <AppShell>
      <h1 className="page-title">Histórico</h1>
      <p className="page-subtitle">
        Todas as leituras do DHT22 registradas pelo ESP32 (ou simuladas).
      </p>

      <div className={styles.toolbar}>
        <div className={styles.filtro}>
          <label className="form-label" style={{ marginBottom: 0 }}>
            Filtrar por cura:
          </label>
          <select
            className="form-select"
            style={{ width: "auto", minWidth: 200 }}
            value={filtroCura}
            onChange={(e) => setFiltroCura(e.target.value)}
          >
            <option value="">Todas as curas</option>
            {curas.map((c) => {
              const lote = buscarLote(c.loteId);
              return (
                <option key={c.id} value={c.id}>
                  {lote?.nomeIdentificacao ?? c.loteId}
                </option>
              );
            })}
          </select>
        </div>

        <div className={styles.resumo}>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Leituras</span>
            <span className={styles.resumoVal}>{leiturasExibidas.length}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Irrigações registradas</span>
            <span className={styles.resumoVal}>{totalVolume}</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        {leiturasExibidas.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2.5rem" }}>☰</span>
            <p>Nenhuma leitura registrada ainda.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Lote</th>
                <th>Temperatura</th>
                <th>Umidade</th>
                <th>Bomba</th>
                <th>Conformidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leiturasExibidas.map((h) => (
                <tr key={h.id}>
                  <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                    {formatarData(h.timestamp)}
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {h.curaNome}
                    </span>
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {h.temperatura}°C
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {h.umidade}%
                  </td>
                  <td>
                    <span
                      className={
                        h.estadoBomba === "ligada"
                          ? styles.bombaLigada
                          : styles.bombaDesligada
                      }
                    >
                      {h.estadoBomba === "ligada" ? "Ligada" : "Desligada"}
                    </span>
                  </td>
                  <td>
                    <span className={conformidadeCls(h.conformidadeGeral, styles)}>
                      {labelConformidadeTelemetria(
                        h.conformidadeGeral as
                          | "conforme"
                          | "desvio_leve"
                          | "desvio_critico"
                          | "sem_dados"
                      )}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/curas/${h.curaId}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Ver cura
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

function conformidadeCls(
  s: string,
  styles: Record<string, string>
): string {
  if (s === "conforme")       return styles.tagConforme;
  if (s === "desvio_leve")    return styles.tagDesvioLeve;
  if (s === "desvio_critico") return styles.tagDesvioCritico;
  return "";
}
