import { Cura, LeituraSensor } from "@/types";
import { gerarId } from "@/utils/formatters";

const CHAVE = "curasense_curas";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function listarCuras(): Cura[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(CHAVE);
  return raw ? (JSON.parse(raw) as Cura[]) : [];
}

export function buscarCura(id: string): Cura | undefined {
  return listarCuras().find((c) => c.id === id);
}

export function iniciarCura(
  receitaId: string,
  nomeIdentificacao: string,
  temperaturaInicial: number,
  umidadeInicial: number
): Cura {
  const curas = listarCuras();
  const nova: Cura = {
    id: gerarId(),
    receitaId,
    nomeIdentificacao,
    inicioCura: new Date().toISOString(),
    status: "ativa",
    temperaturaAtual: temperaturaInicial,
    umidadeAtual: umidadeInicial,
    aguaTotalUsadaMl: 0,
    historico: [],
  };
  localStorage.setItem(CHAVE, JSON.stringify([...curas, nova]));
  return nova;
}

export function atualizarCura(id: string, dados: Partial<Cura>): void {
  const curas = listarCuras().map((c) => (c.id === id ? { ...c, ...dados } : c));
  localStorage.setItem(CHAVE, JSON.stringify(curas));
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
    const aguaAdicionada = leitura.bombaAcionada ? leitura.aguaAplicadaMl : 0;
    return {
      ...c,
      historico: [...c.historico, novaLeitura].slice(-100),
      aguaTotalUsadaMl: c.aguaTotalUsadaMl + aguaAdicionada,
    };
  });
  localStorage.setItem(CHAVE, JSON.stringify(atualizadas));
}

export function listarTodasLeituras(): LeituraSensor[] {
  return listarCuras().flatMap((c) => c.historico);
}
