"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { listarCuras } from "@/services/curasService";
import { buscarReceita } from "@/services/receitasService";
import { formatarData } from "@/utils/formatters";
import { Cura, LeituraSensor } from "@/types";
import styles from "./historico.module.css";
import Link from "next/link";

type LeituraComCura = LeituraSensor & { curaNome: string; curaId: string };

export default function HistoricoPage() {
  const [leituras, setLeituras] = useState<LeituraComCura[]>([]);
  const [filtroCura, setFiltroCura] = useState("");
  const [curas, setCuras] = useState<Cura[]>([]);

  useEffect(() => {
    const todasCuras = listarCuras();
    setCuras(todasCuras);
    const todas: LeituraComCura[] = todasCuras.flatMap((c) =>
      c.historico.map((h) => ({
        ...h,
        curaNome: c.nomeIdentificacao,
        curaId: c.id,
      }))
    );
    todas.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
    setLeituras(todas);
  }, []);

  const leiturasExibidas = filtroCura
    ? leituras.filter((l) => l.curaId === filtroCura)
    : leituras;

  const totalAgua = leiturasExibidas
    .filter((l) => l.bombaAcionada)
    .reduce((acc, l) => acc + l.aguaAplicadaMl, 0);

  const totalAcionamentos = leiturasExibidas.filter((l) => l.bombaAcionada).length;

  return (
    <AppShell>
      <h1 className="page-title">Histórico</h1>
      <p className="page-subtitle">
        Todas as leituras registradas em todas as curas.
      </p>

      {/* Filtro e resumo */}
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
            {curas.map((c) => (
              <option key={c.id} value={c.id}>{c.nomeIdentificacao}</option>
            ))}
          </select>
        </div>

        <div className={styles.resumo}>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Leituras</span>
            <span className={styles.resumoVal}>{leiturasExibidas.length}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Acionamentos</span>
            <span className={styles.resumoVal}>{totalAcionamentos}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Água aplicada</span>
            <span className={styles.resumoVal}>{(totalAgua / 1000).toFixed(2)} L</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        {leiturasExibidas.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2.5rem" }}>☰</span>
            <p>Nenhuma leitura registrada ainda.</p>
            <p style={{ fontSize: "0.8rem" }}>
              Acesse uma cura e simule o acionamento da bomba para gerar leituras.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Cura</th>
                <th>Temp. (°C)</th>
                <th>Umidade (%)</th>
                <th>Água (ml)</th>
                <th>Bomba</th>
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
                  <td className={h.temperatura > 30 ? styles.tempAlta : ""}>{h.temperatura}</td>
                  <td className={h.umidade < 60 ? styles.umidadeBaixa : ""}>{h.umidade}</td>
                  <td>{h.aguaAplicadaMl}</td>
                  <td>
                    {h.bombaAcionada
                      ? <span className="badge badge-green">Acionada</span>
                      : <span className="badge badge-yellow">Inativa</span>}
                  </td>
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
