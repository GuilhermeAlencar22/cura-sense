import { LoteProducao } from "@/types";
import { gerarId } from "@/utils/formatters";
import { calcularRelacoesDosagem } from "@/utils/calcularRelacoes";
import { buscarReceita } from "@/services/receitasService";

const CHAVE = "curasense_lotes";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function listarLotes(): LoteProducao[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(CHAVE);
  return raw ? (JSON.parse(raw) as LoteProducao[]) : [];
}

export function buscarLote(id: string): LoteProducao | undefined {
  return listarLotes().find((l) => l.id === id);
}

type DadosNovoLote = {
  receitaId: string;
  nomeIdentificacao: string;
  quantidadePecas: number;
  massaCimentoReal: number;
  massaAgregadoReal: number;
  massaPigmentoReal: number;
  massaAditivosReal: number;
  massaAguaReal: number;
  observacoes: string;
};

export function registrarLote(dados: DadosNovoLote): LoteProducao {
  const receita = buscarReceita(dados.receitaId);
  if (!receita) throw new Error(`Receita ${dados.receitaId} não encontrada`);

  const relacoes = calcularRelacoesDosagem({
    massaCimento: dados.massaCimentoReal,
    massaAgregado: dados.massaAgregadoReal,
    massaAgua: dados.massaAguaReal,
    massaCimentoPadrao: receita.massaCimento,
    massaAgregadoPadrao: receita.massaAgregado,
    massaAguaPadrao: receita.massaAgua,
  });

  const lote: LoteProducao = {
    id: gerarId(),
    ...dados,
    relacaoAguaCimentoReal: relacoes.relacaoAguaCimento,
    relacaoMassaAgregadoReal: relacoes.relacaoMassaAgregado,
    conformidade: relacoes.conformidade,
    desvioPercentualAC: relacoes.desvioPercentualAC,
    desvioPercentualMA: relacoes.desvioPercentualMA,
    criadoEm: new Date().toISOString(),
  };

  const lotes = listarLotes();
  localStorage.setItem(CHAVE, JSON.stringify([...lotes, lote]));
  return lote;
}

export function atualizarLote(id: string, dados: Partial<LoteProducao>): void {
  const lotes = listarLotes().map((l) => (l.id === id ? { ...l, ...dados } : l));
  localStorage.setItem(CHAVE, JSON.stringify(lotes));
}

export function excluirLote(id: string): void {
  const lotes = listarLotes().filter((l) => l.id !== id);
  localStorage.setItem(CHAVE, JSON.stringify(lotes));
}

export function listarLotesPorReceita(receitaId: string): LoteProducao[] {
  return listarLotes().filter((l) => l.receitaId === receitaId);
}
