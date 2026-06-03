"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import {
  buscarCura,
  atualizarCura,
  finalizarCura,
  registrarLeitura,
  registrarIrrigacao,
} from "@/services/curasService";
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
import {
  avaliarLeitura,
  labelConformidadeTelemetria,
} from "@/utils/calcularConformidadeTelemetria";
import { CuraLote, StatusConformidadeTelemetria } from "@/types";
import styles from "./detalhe.module.css";

// ─── Helpers locais ────────────────────────────────────────────────────────────

function fmtDesvio(d: number): string {
  return `${d > 0 ? "+" : ""}${d}%`;
}

function clsDesvio(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 3) return styles.desvioOk;
  if (abs <= 8) return styles.desvioLeve;
  return styles.desvioCritico;
}

function clsConformidadeTelemetria(s: StatusConformidadeTelemetria): string {
  if (s === "conforme")       return styles.tagConforme;
  if (s === "desvio_leve")    return styles.tagDesvioLeve;
  if (s === "desvio_critico") return styles.tagDesvioCritico;
  return styles.tagSemDados;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function DetalheCuraPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cura, setCura] = useState<CuraLote | null>(null);

  function recarregar() {
    setCura(buscarCura(id) ?? null);
  }

  useEffect(() => {
    recarregar();
  }, [id]);

  if (!cura) {
    return (
      <AppShell>
        <p style={{ color: "var(--color-text-muted)", marginTop: 32 }}>
          Cura não encontrada.{" "}
          <a href="/curas" style={{ color: "var(--color-primary)" }}>
            Ver todas as curas.
          </a>
        </p>
      </AppShell>
    );
  }

  const lote    = buscarLote(cura.loteId);
  const receita = buscarReceita(cura.receitaId);
  const diasRestantes = calcularDiasRestantes(cura.previsaoFim);
  const progresso     = receita ? calcularProgresso(cura.inicioCura, receita.diasCura) : 0;
  const ativa         = cura.status === "em_cura";

  const temLeitura = cura.temperaturaAtual !== null && cura.umidadeAtual !== null;
  const conformidade = temLeitura
    ? avaliarLeitura(cura.temperaturaAtual!, cura.umidadeAtual!, cura.parametros)
    : null;

  const alertaTemp =
    conformidade?.temperatura === "desvio_critico" ||
    conformidade?.temperatura === "desvio_leve";
  const alertaUmidade =
    conformidade?.umidade === "desvio_critico" ||
    conformidade?.umidade === "desvio_leve";

  // Volume total irrigado
  const volumeTotal = cura.historicoIrrigacao.reduce(
    (acc, e) => acc + e.volumeEstimadoMl,
    0
  );

  // ── Simulação de leituras ────────────────────────────────────────────────────

  function simularLeituraNormal() {
    const p = cura!.parametros;
    const temp = (p.temperaturaIdealMin + p.temperaturaIdealMax) / 2;
    const umid = (p.umidadeIdealMin + p.umidadeIdealMax) / 2;
    registrarLeitura(cura!.id, {
      temperatura: temp,
      umidade: umid,
      estadoBomba: "desligada",
    });
    atualizarCura(cura!.id, { status: "em_cura" });
    recarregar();
  }

  function simularTempAlta() {
    registrarLeitura(cura!.id, {
      temperatura: cura!.parametros.temperaturaIdealMax + 5,
      umidade: cura!.umidadeAtual ?? cura!.parametros.umidadeIdealMin,
      estadoBomba: cura!.estadoBomba,
    });
    recarregar();
  }

  function simularUmidadeBaixa() {
    registrarLeitura(cura!.id, {
      temperatura: cura!.temperaturaAtual ?? cura!.parametros.temperaturaIdealMin,
      umidade: cura!.parametros.umidadeIdealMin - 10,
      estadoBomba: cura!.estadoBomba,
    });
    recarregar();
  }

  function simularIrrigacao() {
    const regra = cura!.parametros.regraIrrigacao;
    registrarLeitura(cura!.id, {
      temperatura: cura!.temperaturaAtual ?? cura!.parametros.temperaturaIdealMin,
      umidade: cura!.umidadeAtual ?? cura!.parametros.umidadeIdealMin,
      estadoBomba: "ligada",
    });
    registrarIrrigacao(cura!.id, {
      duracaoSegundos: regra.duracaoSegundos,
      volumeEstimadoMl: regra.mlPorAcionamento,
      origem: "manual",
    });
    recarregar();
  }

  function handleFinalizar() {
    if (confirm("Finalizar esta cura? O lote será marcado como concluído.")) {
      finalizarCura(cura!.id);
      recarregar();
    }
  }

  function handleInterromper() {
    if (confirm("Interromper esta cura? Esta ação não pode ser desfeita.")) {
      atualizarCura(cura!.id, { status: "interrompida" });
      recarregar();
    }
  }

  return (
    <AppShell>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className={styles.topRow}>
        <div className={styles.topLeft}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => router.back()}
          >
            ← Voltar
          </button>
          <div>
            <div className={styles.titleRow}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {lote?.nomeIdentificacao ?? "Cura"}
              </h1>
              <StatusBadge status={cura.status} />
            </div>
            {receita && (
              <p className={styles.subtitulo}>
                {receita.nome} · {labelTipoPeca(receita.tipoPeca)} ·{" "}
                {labelTipoConcreto(receita.tipoConcreto)}
              </p>
            )}
          </div>
        </div>
        {ativa && (
          <div className={styles.topActions}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleInterromper}
            >
              Interromper cura
            </button>
            <button className="btn btn-danger" onClick={handleFinalizar}>
              Finalizar cura
            </button>
          </div>
        )}
      </div>

      {/* ── Alertas de conformidade ─────────────────────────────────────── */}
      {ativa && (alertaTemp || alertaUmidade) && (
        <div className={styles.alertasWrap}>
          {alertaTemp && (
            <div className={styles.alertaBanner}>
              <span>🌡</span>
              <div>
                <p className={styles.alertaTitulo}>
                  Temperatura fora da faixa ideal
                </p>
                <p className={styles.alertaDesc}>
                  {cura.temperaturaAtual}°C detectados — faixa ideal:{" "}
                  {cura.parametros.temperaturaIdealMin}–
                  {cura.parametros.temperaturaIdealMax}°C.
                </p>
              </div>
            </div>
          )}
          {alertaUmidade && (
            <div className={`${styles.alertaBanner} ${styles.alertaBannerWarn}`}>
              <span>💧</span>
              <div>
                <p className={styles.alertaTitulo}>Umidade fora da faixa ideal</p>
                <p className={styles.alertaDesc}>
                  {cura.umidadeAtual}% detectados — faixa ideal:{" "}
                  {cura.parametros.umidadeIdealMin}–
                  {cura.parametros.umidadeIdealMax}%.
                  {cura.umidadeAtual !== null &&
                    cura.umidadeAtual < cura.parametros.umidadeMinima &&
                    " Irrigação automática pode ser acionada."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Status da cura ────────────────────────────────────────────────── */}
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
              {cura.status === "concluida" || cura.status === "interrompida"
                ? "—"
                : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`}
            </strong>
          </div>
          <div className={styles.statusItem}>
            <span>Ambiente</span>
            <strong>
              {receita ? labelAmbienteCura(receita.ambienteCura) : "—"}
            </strong>
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
              className={`${styles.progressoFill} ${
                cura.status === "concluida"
                  ? styles.progressoFinalizado
                  : cura.status === "interrompida"
                  ? styles.progressoAlerta
                  : ""
              }`}
              style={{ width: `${progresso}%` }}
            />
          </div>
          {cura.status === "concluida" && (
            <p className={styles.progressoLabel}>Cura finalizada com sucesso.</p>
          )}
          {cura.status === "interrompida" && (
            <p className={`${styles.progressoLabel} ${styles.progressoLabelCancelado}`}>
              Cura interrompida.
            </p>
          )}
        </div>
      </section>

      {/* ── Grid: parâmetros da câmara + dados do lote ──────────────────── */}
      <div className={styles.grid}>

        {/* Card: Monitoramento da Câmara */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Monitoramento da Câmara</h2>

          <div className={styles.sensoresGrid}>
            {/* Temperatura */}
            <div className={`${styles.sensorBox} ${alertaTemp ? styles.sensorDanger : ""}`}>
              <span className={styles.sensorIcone}>🌡</span>
              <div>
                <p className={styles.sensorLabel}>Temperatura</p>
                <p className={`${styles.sensorVal} ${alertaTemp ? styles.sensorValDanger : ""}`}>
                  {cura.temperaturaAtual !== null
                    ? `${cura.temperaturaAtual}°C`
                    : "—"}
                </p>
                <p className={styles.sensorIdeal}>
                  Ideal: {cura.parametros.temperaturaIdealMin}–
                  {cura.parametros.temperaturaIdealMax}°C
                </p>
                {conformidade && (
                  <span className={clsConformidadeTelemetria(conformidade.temperatura)}>
                    {labelConformidadeTelemetria(conformidade.temperatura)}
                  </span>
                )}
              </div>
            </div>

            {/* Umidade */}
            <div className={`${styles.sensorBox} ${alertaUmidade ? styles.sensorWarning : ""}`}>
              <span className={styles.sensorIcone}>💧</span>
              <div>
                <p className={styles.sensorLabel}>Umidade</p>
                <p className={`${styles.sensorVal} ${alertaUmidade ? styles.sensorValWarn : ""}`}>
                  {cura.umidadeAtual !== null ? `${cura.umidadeAtual}%` : "—"}
                </p>
                <p className={styles.sensorIdeal}>
                  Ideal: {cura.parametros.umidadeIdealMin}–
                  {cura.parametros.umidadeIdealMax}%
                </p>
                {conformidade && (
                  <span className={clsConformidadeTelemetria(conformidade.umidade)}>
                    {labelConformidadeTelemetria(conformidade.umidade)}
                  </span>
                )}
              </div>
            </div>

            {/* Bomba */}
            <div className={styles.sensorBox}>
              <span className={styles.sensorIcone}>⚙</span>
              <div>
                <p className={styles.sensorLabel}>Microbomba</p>
                <p
                  className={`${styles.sensorVal} ${
                    cura.estadoBomba === "ligada"
                      ? styles.bombaLigada
                      : styles.bombaDesligada
                  }`}
                >
                  {cura.estadoBomba === "ligada" ? "LIGADA" : "Desligada"}
                </p>
                <p className={styles.sensorIdeal}>
                  Modo: {cura.parametros.modoControle === "automatico" ? "Automático" : "Manual"}
                </p>
              </div>
            </div>

            {/* Volume total irrigado */}
            <div className={styles.sensorBox}>
              <span className={styles.sensorIcone}>📊</span>
              <div>
                <p className={styles.sensorLabel}>Volume irrigado</p>
                <p className={styles.sensorVal}>{volumeTotal.toFixed(1)} ml</p>
                <p className={styles.sensorIdeal}>
                  {cura.historicoIrrigacao.length} acionamento
                  {cura.historicoIrrigacao.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Regra de irrigação */}
          <div className={styles.regraBox}>
            <p className={styles.regraTitle}>Regra de irrigação</p>
            <div className={styles.regraGrid}>
              <span>
                Vazão: {cura.parametros.regraIrrigacao.vazaoMlPorSegundo} ml/s
              </span>
              <span>
                Volume/ciclo: {cura.parametros.regraIrrigacao.mlPorAcionamento} ml
              </span>
              <span>
                Duração: {cura.parametros.regraIrrigacao.duracaoSegundos}s
              </span>
              <span>
                Intervalo: {cura.parametros.regraIrrigacao.intervaloMinutos} min
              </span>
              <span>
                Limiar umidade: {cura.parametros.regraIrrigacao.umidadeMinima}%
              </span>
            </div>
          </div>

          {/* Simulação */}
          {ativa && (
            <div className={styles.simBtns}>
              <p className={styles.simTitulo}>Simulação de leituras</p>
              <div className={styles.simGrid}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={simularLeituraNormal}
                >
                  ◎ Leitura normal
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={simularTempAlta}
                >
                  🌡 Temperatura alta
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={simularUmidadeBaixa}
                >
                  💧 Umidade baixa
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={simularIrrigacao}
                >
                  ⚙ Simular irrigação
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Card: Dados do Lote */}
        {lote && receita && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Dados do Lote</h2>
            <div className={styles.paramList}>
              <ParamRow
                label="Quantidade"
                value={`${lote.quantidadePecas} peça${lote.quantidadePecas !== 1 ? "s" : ""}`}
              />
              <ParamRow
                label="A/C real"
                value={lote.relacaoAguaCimentoReal.toFixed(3)}
              />
              <ParamRow
                label="A/C padrão"
                value={receita.relacaoAguaCimento.toFixed(3)}
              />
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
                <span
                  className={`badge ${
                    lote.conformidade === "conforme"
                      ? "badge-green"
                      : lote.conformidade === "desvio_leve"
                      ? "badge-yellow"
                      : "badge-red"
                  }`}
                >
                  {labelConformidade(lote.conformidade)}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── Linha do Tempo ─────────────────────────────────────────────────── */}
      {receita && (
        <LinhaDoTempo
          inicioCura={cura.inicioCura}
          previsaoFim={cura.previsaoFim}
          diasCura={receita.diasCura}
          progresso={progresso}
          status={cura.status}
        />
      )}

      {/* ── Histórico de leituras DHT22 ────────────────────────────────────── */}
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
                  Use os botões de simulação acima ou o Simulador para registrar leituras.
                </p>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data / Hora</th>
                  <th>Temperatura</th>
                  <th>Umidade</th>
                  <th>Bomba</th>
                  <th>Conformidade</th>
                </tr>
              </thead>
              <tbody>
                {[...cura.historico].reverse().map((h, i) => {
                  const conf = avaliarLeitura(
                    h.temperatura,
                    h.umidade,
                    cura.parametros
                  );
                  return (
                    <tr
                      key={h.id}
                      className={
                        conf.geral === "desvio_critico" ? styles.rowAlerta : ""
                      }
                    >
                      <td className={styles.tdNum}>
                        {cura.historico.length - i}
                      </td>
                      <td>{formatarData(h.timestamp)}</td>
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
                          {h.estadoBomba === "ligada" ? "Ligada" : "—"}
                        </span>
                      </td>
                      <td>
                        <span className={clsConformidadeTelemetria(conf.geral)}>
                          {labelConformidadeTelemetria(conf.geral)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Histórico de irrigação ─────────────────────────────────────────── */}
      {cura.historicoIrrigacao.length > 0 && (
        <section className={styles.historicoSection}>
          <div className={styles.historicoHeader}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Histórico de irrigação
              <span className={styles.historicoCount}>
                {cura.historicoIrrigacao.length}
              </span>
            </h2>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data / Hora</th>
                  <th>Duração</th>
                  <th>Volume estimado</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {[...cura.historicoIrrigacao].reverse().map((e, i) => (
                  <tr key={e.id}>
                    <td className={styles.tdNum}>
                      {cura.historicoIrrigacao.length - i}
                    </td>
                    <td>{formatarData(e.timestamp)}</td>
                    <td>{e.duracaoSegundos}s</td>
                    <td>{e.volumeEstimadoMl} ml</td>
                    <td>
                      <span
                        className={
                          e.origem === "automatico"
                            ? styles.origemAuto
                            : styles.origemManual
                        }
                      >
                        {e.origem === "automatico" ? "Automático" : "Manual"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ParamRow({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls?: string;
}) {
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
  const marcos = [0, 25, 50, 75, 100];

  function dataMarco(pct: number): string {
    const inicio = new Date(inicioCura).getTime();
    const fim    = new Date(previsaoFim).getTime();
    const ts     = inicio + (fim - inicio) * (pct / 100);
    return new Date(ts).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <section className={styles.timelineCard}>
      <h2 className={styles.cardTitle}>Linha do Tempo da Cura</h2>

      <div className={styles.timelineWrap}>
        <div className={styles.timelineTrilho}>
          <div
            className={`${styles.timelineProgresso} ${
              status === "concluida"
                ? styles.timelineFinalizado
                : status === "interrompida"
                ? styles.timelineAlerta
                : ""
            }`}
            style={{ width: `${progresso}%` }}
          />
        </div>

        <div className={styles.timelineMarcos}>
          {marcos.map((pct) => {
            const passado = progresso >= pct;
            const atual   = progresso >= pct && (pct === 100 || progresso < pct + 25);
            return (
              <div key={pct} className={styles.marco}>
                <div
                  className={`${styles.marcoPonto} ${passado ? styles.marcoPassado : ""} ${
                    atual && status === "interrompida" ? styles.marcoAlerta : ""
                  }`}
                />
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
