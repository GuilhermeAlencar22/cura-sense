import { CuraLote, LeituraSensor, StatusCura } from "@/types";
import { gerarId } from "@/utils/formatters";
import { buscarLote } from "@/services/lotesService";
import { buscarReceita } from "@/services/receitasService";

const CHAVE = "curasense_curas";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function listarCuras(): CuraLote[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(CHAVE);
  return raw ? (JSON.parse(raw) as CuraLote[]) : [];
}

export function buscarCura(id: string): CuraLote | undefined {
  return listarCuras().find((c) => c.id === id);
}

export function buscarCuraPorLote(loteId: string): CuraLote | undefined {
  return listarCuras().find((c) => c.loteId === loteId);
}

export function iniciarCura(loteId: string): CuraLote {
  const lote = buscarLote(loteId);
  if (!lote) throw new Error(`Lote ${loteId} não encontrado`);

  const receita = buscarReceita(lote.receitaId);
  if (!receita) throw new Error(`Receita ${lote.receitaId} não encontrada`);

  const inicio = new Date();
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + receita.diasCura);

  const cura: CuraLote = {
    id: gerarId(),
    loteId,
    receitaId: lote.receitaId,
    inicioCura: inicio.toISOString(),
    previsaoFim: fim.toISOString(),
    status: "em_cura",
    temperaturaTanque: null,
    temperaturaAmbiente: null,
    nivelAguaTanque: null,
    historico: [],
  };

  const curas = listarCuras();
  localStorage.setItem(CHAVE, JSON.stringify([...curas, cura]));
  return cura;
}

export function atualizarCura(id: string, dados: Partial<CuraLote>): void {
  const curas = listarCuras().map((c) => (c.id === id ? { ...c, ...dados } : c));
  localStorage.setItem(CHAVE, JSON.stringify(curas));
}

export function finalizarCura(id: string): void {
  atualizarCura(id, { status: "finalizada" });
}

export function excluirCura(id: string): void {
  const curas = listarCuras().filter((c) => c.id !== id);
  localStorage.setItem(CHAVE, JSON.stringify(curas));
}

export function registrarLeitura(
  curaId: string,
  leitura: Omit<LeituraSensor, "id" | "curaId">
): void {
  const curas = listarCuras();
  const atualizadas = curas.map((c) => {
    if (c.id !== curaId) return c;
    const novaLeitura: LeituraSensor = { ...leitura, id: gerarId(), curaId };
    return {
      ...c,
      temperaturaTanque: leitura.temperaturaTanque ?? c.temperaturaTanque,
      temperaturaAmbiente: leitura.temperaturaAmbiente ?? c.temperaturaAmbiente,
      nivelAguaTanque: leitura.nivelAguaTanque ?? c.nivelAguaTanque,
      historico: [...c.historico, novaLeitura].slice(-100),
    };
  });
  localStorage.setItem(CHAVE, JSON.stringify(atualizadas));
}

export function listarCurasAtivas(): CuraLote[] {
  return listarCuras().filter((c) => c.status === "em_cura");
}

export function verificarCurasVencidas(): void {
  const agora = new Date();
  const curas = listarCuras();
  const atualizadas = curas.map((c) => {
    if (c.status !== "em_cura") return c;
    const venceu = new Date(c.previsaoFim) <= agora;
    return venceu ? { ...c, status: "alerta" as StatusCura } : c;
  });
  localStorage.setItem(CHAVE, JSON.stringify(atualizadas));
}
