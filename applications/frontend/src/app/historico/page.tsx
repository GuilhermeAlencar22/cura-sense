"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { listarCuras } from "@/services/curasService";
import { buscarLote } from "@/services/lotesService";
import { formatarData } from "@/utils/formatters";
import { CuraLote, LeituraSensor } from "@/types";
import styles from "./historico.module.css";
import Link from "next/link";

type LeituraComCura = LeituraSensor & { curaNome: string; curaId: string };

export default function HistoricoPage() {
  const [leituras, setLeituras] = useState<LeituraComCura[]>([]);
  const [filtroCura, setFiltroCura] = useState("");
  const [curas, setCuras] = useState<CuraLote[]>([]);

  useEffect(() => {
    const todasCuras = listarCuras();
    setCuras(todasCuras);
    const todas: LeituraComCura[] = todasCuras.flatMap((c) => {
      const lote = buscarLote(c.loteId);
      return c.historico.map((h) => ({
        ...h,
        curaNome: lote?.nomeIdentificacao ?? c.loteId,
        curaId: c.id,
      }));
    });
    todas.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
    setLeituras(todas);
  }, []);

  const leiturasExibidas = filtroCura
    ? leituras.filter((l) => l.curaId === filtroCura)
    : leituras;

  return (
    <AppShell>
      <h1 className="page-title">Histórico</h1>
      <p className="page-subtitle">Todas as leituras registradas pelo ESP32 (ou simuladas).</p>

      <div className={styles.toolbar}>
        <div className={styles.filtro}>
          <label className="form-label" style={{ marginBottom: 0 }}>Filtrar por cura:</label>
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
                <th>Data/Hora</th>
                <th>Lote</th>
                <th>Temp. tanque</th>
                <th>Temp. ambiente</th>
                <th>Nível tanque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leiturasExibidas.map((h) => (
                <tr key={h.id}>
                  <td>{formatarData(h.dataHora)}</td>
                  <td>
                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {h.curaNome}
                    </span>
                  </td>
                  <td>{h.temperaturaTanque != null ? `${h.temperaturaTanque}°C` : "—"}</td>
                  <td>{h.temperaturaAmbiente != null ? `${h.temperaturaAmbiente}°C` : "—"}</td>
                  <td>{h.nivelAguaTanque ?? "—"}</td>
                  <td>
                    <Link href={`/curas/${h.curaId}`} className="btn btn-secondary btn-sm">
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
