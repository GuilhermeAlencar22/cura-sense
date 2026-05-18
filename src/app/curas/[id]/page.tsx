"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { buscarCura, atualizarCura, finalizarCura, registrarLeitura } from "@/services/curasService";
import { buscarLote } from "@/services/lotesService";
import { buscarReceita } from "@/services/receitasService";
import {
  calcularDiasRestantes,
  calcularProgresso,
  formatarData,
  formatarDataCurta,
  labelTipoPeca,
  labelTipoConcreto,
  labelAmbienteCura,
  labelConformidade,
} from "@/utils/formatters";
import { CuraLote, LoteProducao, ReceitaTraco } from "@/types";
import styles from "./detalhe.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDesvio(d: number): string {
  return `${d > 0 ? "+" : ""}${d}%`;
}

function clsDesvio(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 3) return styles.desvioOk;
  if (abs <= 8) return styles.desvioLeve;
  return styles.desvioCritico;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function DetalheCuraPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cura, setCura] = useState<CuraLote | null>(null);

  function recarregar() {
    setCura(buscarCura(id) ?? null);
  }

  useEffect(() => { recarregar(); }, [id]);

  if (!cura) {
    return (
      <AppShell>
        <p style={{ color: "var(--color-text-muted)", marginTop: 32 }}>
          Cura não encontrada.{" "}
          <a href="/curas" style={{ color: "var(--color-primary)" }}>Ver todas as curas.</a>
        </p>
      </AppShell>
    );
  }

  const lote    = buscarLote(cura.loteId);
  const receita = buscarReceita(cura.receitaId);
  const diasRestantes = calcularDiasRestantes(cura.previsaoFim);
  const progresso     = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;
  const ativa         = cura.status === "em_cura" || cura.status === "alerta";

  // Alertas de sensor
  const alertaTemp  = cura.temperaturaTanque != null && cura.temperaturaTanque > 30;
  const alertaNivel = cura.nivelAguaTanque === "baixo" || cura.nivelAguaTanque === "critico";

  // ── Ações ─────────────────────────────────────────────────────────────────

  function registrarNormal() {
    registrarLeitura(cura!.id, {
      temperaturaTanque: 22,
      temperaturaAmbiente: 25,
      nivelAguaTanque: "ok",
      dataHora: new Date().toISOString(),
    });
    atualizarCura(cura!.id, { temperaturaTanque: 22, temperaturaAmbiente: 25, nivelAguaTanque: "ok", status: "em_cura" });
    recarregar();
  }

  function simularTempAlta() {
    registrarLeitura(cura!.id, {
      temperaturaTanque: 36,
      temperaturaAmbiente: 34,
      nivelAguaTanque: cura!.nivelAguaTanque ?? "ok",
      dataHora: new Date().toISOString(),
    });
    atualizarCura(cura!.id, { temperaturaTanque: 36, temperaturaAmbiente: 34, status: "alerta" });
    recarregar();
  }

  function simularNivelBaixo() {
    registrarLeitura(cura!.id, {
      temperaturaTanque: cura!.temperaturaTanque ?? 22,
      temperaturaAmbiente: cura!.temperaturaAmbiente ?? 25,
      nivelAguaTanque: "baixo",
      dataHora: new Date().toISOString(),
    });
    atualizarCura(cura!.id, { nivelAguaTanque: "baixo", status: "alerta" });
    recarregar();
  }

  function normalizar() {
    registrarNormal();
  }

  function handleFinalizar() {
    if (confirm("Finalizar esta cura? O lote será marcado como concluído.")) {
      finalizarCura(cura!.id);
      recarregar();
    }
  }

  function handleCancelar() {
    if (confirm("Cancelar esta cura? Esta ação não pode ser desfeita.")) {
      atualizarCura(cura!.id, { status: "cancelada" });
      recarregar();
    }
  }

  return (
    <AppShell>
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <div className={styles.topRow}>
        <div className={styles.topLeft}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>← Voltar</button>
          <div>
            <div className={styles.titleRow}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {lote?.nomeIdentificacao ?? "Cura"}
              </h1>
              <StatusBadge status={cura.status} />
            </div>
            {receita && (
              <p className={styles.subtitulo}>
                {receita.nome} · {labelTipoPeca(receita.tipoPeca)} · {labelTipoConcreto(receita.tipoConcreto)}
              </p>
            )}
          </div>
        </div>
        {ativa && (
          <div className={styles.topActions}>
            <button className="btn btn-secondary btn-sm" onClick={handleCancelar}>
              Cancelar cura
            </button>
            <button className="btn btn-danger" onClick={handleFinalizar}>
              Finalizar cura
            </button>
          </div>
        )}
      </div>

      {/* ── Alertas ─────────────────────────────────────────────────────── */}
      {ativa && (alertaTemp || alertaNivel) && (
        <div className={styles.alertasWrap}>
          {alertaTemp && (
            <div className={styles.alertaBanner}>
              <span>🌡</span>
              <div>
                <p className={styles.alertaTitulo}>Temperatura elevada no tanque</p>
                <p className={styles.alertaDesc}>
                  {cura.temperaturaTanque}°C detectados — temperatura acima de 30°C pode comprometer a cura do UHPC.
                </p>
              </div>
            </div>
          )}
          {alertaNivel && (
            <div className={`${styles.alertaBanner} ${styles.alertaBannerWarn}`}>
              <span>💧</span>
              <div>
                <p className={styles.alertaTitulo}>Nível de água {cura.nivelAguaTanque === "critico" ? "crítico" : "baixo"}</p>
                <p className={styles.alertaDesc}>
                  Verifique e reponha a água do tanque para garantir a cura submersa adequada.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Card 1: Status da Cura ──────────────────────────────────────── */}
      <section className={styles.statusCard}>
        <div className={styles.statusMeta}>
          <div className={styles.statusItem}>
            <span>Início</span>
            <strong>{formatarDataCurta(cura.inicioCura)}</strong>
          </div>
          <div className={styles.statusItem}>
            <span>Previsão de fim</span>
            <strong>{formatarDataCurta(cura.previsaoFim)}</strong>
          </div>
          <div className={styles.statusItem}>
            <span>Dias totais</span>
            <strong>{receita?.diasCura ?? "—"} dias</strong>
          </div>
          <div className={styles.statusItem}>
            <span>Dias restantes</span>
            <strong className={diasRestantes === 0 ? styles.diasZero : ""}>
              {cura.status === "finalizada" || cura.status === "cancelada" ? "—" : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`}
            </strong>
          </div>
          <div className={styles.statusItem}>
            <span>Ambiente</span>
            <strong>{receita ? labelAmbienteCura(receita.ambienteCura) : "—"}</strong>
          </div>
          <div className={styles.statusItem}>
            <span>Leituras</span>
            <strong>{cura.historico.length}</strong>
          </div>
        </div>

        <div className={styles.progressoWrap}>
          <div className={styles.progressoHeader}>
            <span>Progresso da cura</span>
            <span className={styles.progressoPct}>{progresso}%</span>
          </div>
          <div className={styles.progressoBar}>
            <div
              className={`${styles.progressoFill} ${cura.status === "finalizada" ? styles.progressoFinalizado : cura.status === "alerta" ? styles.progressoAlerta : ""}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
          {cura.status === "finalizada" && (
            <p className={styles.progressoLabel}>Cura finalizada com sucesso.</p>
          )}
          {cura.status === "cancelada" && (
            <p className={`${styles.progressoLabel} ${styles.progressoLabelCancelado}`}>Cura cancelada.</p>
          )}
        </div>
      </section>

      {/* ── Grid principal ──────────────────────────────────────────────── */}
      <div className={styles.grid}>

        {/* Card 2: Dados do Lote */}
        {lote && receita && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Dados do Lote</h2>
            <div className={styles.paramList}>
              <ParamRow label="Quantidade" value={`${lote.quantidadePecas} peça${lote.quantidadePecas !== 1 ? "s" : ""}`} />
              <ParamRow label="A/C real" value={lote.relacaoAguaCimentoReal.toFixed(3)} />
              <ParamRow label="A/C padrão" value={receita.relacaoAguaCimento.toFixed(3)} />
              <ParamRow
                label="Desvio A/C"
                value={fmtDesvio(lote.desvioPercentualAC)}
                cls={clsDesvio(lote.desvioPercentualAC)}
              />
              <ParamRow
                label="Desvio Cim./Agr."
                value={fmtDesvio(lote.desvioPercentualMA)}
                cls={clsDesvio(lote.desvioPercentualMA)}
              />
              <div className={styles.paramRowEl}>
                <span>Conformidade</span>
                <span className={`badge ${lote.conformidade === "conforme" ? "badge-green" : lote.conformidade === "desvio_leve" ? "badge-yellow" : "badge-red"}`}>
                  {labelConformidade(lote.conformidade)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Card 3: Parâmetros do Tanque */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Parâmetros do Tanque</h2>

          <div className={styles.sensoresGrid}>
            <div className={`${styles.sensorBox} ${alertaTemp ? styles.sensorDanger : ""}`}>
              <span className={styles.sensorIcone}>🌡</span>
              <div>
                <p className={styles.sensorLabel}>Temp. tanque</p>
                <p className={`${styles.sensorVal} ${alertaTemp ? styles.sensorValDanger : ""}`}>
                  {cura.temperaturaTanque != null ? `${cura.temperaturaTanque}°C` : "—"}
                </p>
                {alertaTemp && <p className={styles.sensorAlerta}>Acima de 30°C</p>}
              </div>
            </div>

            <div className={styles.sensorBox}>
              <span className={styles.sensorIcone}>🌡</span>
              <div>
                <p className={styles.sensorLabel}>Temp. ambiente</p>
                <p className={styles.sensorVal}>
                  {cura.temperaturaAmbiente != null ? `${cura.temperaturaAmbiente}°C` : "—"}
                </p>
              </div>
            </div>

            <div className={`${styles.sensorBox} ${alertaNivel ? (cura.nivelAguaTanque === "critico" ? styles.sensorDanger : styles.sensorWarning) : ""}`}>
              <span className={styles.sensorIcone}>💧</span>
              <div>
                <p className={styles.sensorLabel}>Nível da água</p>
                <p className={`${styles.sensorVal} ${alertaNivel ? styles.sensorValWarn : ""}`}>
                  {cura.nivelAguaTanque === "ok" ? "Normal"
                    : cura.nivelAguaTanque === "baixo" ? "Baixo"
                    : cura.nivelAguaTanque === "critico" ? "Crítico"
                    : "—"}
                </p>
                {alertaNivel && <p className={styles.sensorAlerta}>Repor água</p>}
              </div>
            </div>

            <div className={styles.sensorBox}>
              <span className={styles.sensorIcone}>📊</span>
              <div>
                <p className={styles.sensorLabel}>Última leitura</p>
                <p className={styles.sensorValSm}>
                  {cura.historico.length > 0
                    ? formatarData(cura.historico[cura.historico.length - 1].dataHora)
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {ativa && (
            <div className={styles.simBtns}>
              <p className={styles.simTitulo}>Simulação de leituras</p>
              <div className={styles.simGrid}>
                <button className="btn btn-secondary btn-sm" onClick={registrarNormal}>
                  ◎ Leitura normal
                </button>
                <button className="btn btn-warning btn-sm" onClick={simularTempAlta}>
                  🌡 Temperatura alta
                </button>
                <button className="btn btn-warning btn-sm" onClick={simularNivelBaixo}>
                  💧 Nível baixo
                </button>
                <button className="btn btn-success btn-sm" onClick={normalizar}>
                  ✓ Normalizar tanque
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Card 4: Linha do Tempo ───────────────────────────────────────── */}
      {receita && (
        <LinhaDoTempo
          inicioCura={cura.inicioCura}
          previsaoFim={cura.previsaoFim}
          diasCura={receita.diasCura}
          progresso={progresso}
          status={cura.status}
        />
      )}

      {/* ── Card 5: Histórico de Leituras ────────────────────────────────── */}
      <section className={styles.historicoSection}>
        <div className={styles.historicoHeader}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Histórico de leituras
            <span className={styles.historicoCount}>{cura.historico.length}</span>
          </h2>
        </div>
        <div className="table-container">
          {cura.historico.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: "2rem" }}>◎</span>
              <p>Nenhuma leitura registrada ainda.</p>
              {ativa && (
                <p style={{ fontSize: "0.8125rem", marginTop: 4 }}>
                  Use os botões de simulação acima para registrar leituras.
                </p>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data / Hora</th>
                  <th>Temp. tanque</th>
                  <th>Temp. ambiente</th>
                  <th>Nível da água</th>
                </tr>
              </thead>
              <tbody>
                {[...cura.historico].reverse().map((h, i) => {
                  const tAlta = h.temperaturaTanque != null && h.temperaturaTanque > 30;
                  const nBaixo = h.nivelAguaTanque === "baixo" || h.nivelAguaTanque === "critico";
                  return (
                    <tr key={h.id} className={tAlta || nBaixo ? styles.rowAlerta : ""}>
                      <td className={styles.tdNum}>{cura.historico.length - i}</td>
                      <td>{formatarData(h.dataHora)}</td>
                      <td className={tAlta ? styles.tdDanger : ""}>
                        {h.temperaturaTanque != null ? `${h.temperaturaTanque}°C` : "—"}
                        {tAlta && <span className={styles.tdAlertaTag}>alta</span>}
                      </td>
                      <td>
                        {h.temperaturaAmbiente != null ? `${h.temperaturaAmbiente}°C` : "—"}
                      </td>
                      <td className={nBaixo ? styles.tdWarn : ""}>
                        {h.nivelAguaTanque === "ok" ? "Normal"
                          : h.nivelAguaTanque === "baixo" ? "Baixo"
                          : h.nivelAguaTanque === "critico" ? "Crítico"
                          : "—"}
                        {nBaixo && <span className={styles.tdAlertaTagWarn}>atenção</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ParamRow({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className={styles.paramRowEl}>
      <span>{label}</span>
      <strong className={cls}>{value}</strong>
    </div>
  );
}

function LinhaDoTempo({
  inicioCura,
  previsaoFim,
  diasCura,
  progresso,
  status,
}: {
  inicioCura: string;
  previsaoFim: string;
  diasCura: number;
  progresso: number;
  status: CuraLote["status"];
}) {
  // Marcos: início, 25%, 50%, 75%, fim
  const marcos = [0, 25, 50, 75, 100];

  function dataMarco(pct: number): string {
    const inicio = new Date(inicioCura).getTime();
    const fim    = new Date(previsaoFim).getTime();
    const ts     = inicio + (fim - inicio) * (pct / 100);
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  return (
    <section className={styles.timelineCard}>
      <h2 className={styles.cardTitle}>Linha do Tempo da Cura</h2>

      <div className={styles.timelineWrap}>
        {/* trilho */}
        <div className={styles.timelineTrilho}>
          <div
            className={`${styles.timelineProgresso} ${status === "finalizada" ? styles.timelineFinalizado : status === "alerta" ? styles.timelineAlerta : ""}`}
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* marcadores */}
        <div className={styles.timelineMarcos}>
          {marcos.map((pct) => {
            const passado = progresso >= pct;
            const atual   = progresso >= pct && (pct === 100 || progresso < pct + 25);
            return (
              <div key={pct} className={styles.marco}>
                <div className={`${styles.marcoPonto} ${passado ? styles.marcoPassado : ""} ${atual && status === "alerta" ? styles.marcoAlerta : ""}`} />
                <span className={styles.marcoLabel}>
                  {pct === 0 ? "Início" : pct === 100 ? "Fim" : `${pct}%`}
                </span>
                <span className={styles.marcoData}>{dataMarco(pct)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.timelineInfo}>
        <span>Início: {formatarDataCurta(inicioCura)}</span>
        <span>{diasCura} dias no total</span>
        <span>Fim previsto: {formatarDataCurta(previsaoFim)}</span>
      </div>
    </section>
  );
}
