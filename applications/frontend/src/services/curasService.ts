import {
  CuraLote,
  LeituraCamara,
  EventoBomba,
  StatusCura,
  EstadoBomba,
} from "@/types";
import { gerarId } from "@/utils/formatters";
import { buscarLote } from "@/services/lotesService";
import { buscarReceita, PARAMETROS_PADRAO } from "@/services/receitasService";

const CHAVE = "curasense_curas";
const SCHEMA_VERSION = "v2"; // incrementar ao mudar o modelo de CuraLote
const CHAVE_VERSION  = "curasense_curas_version";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function salvarCuras(curas: CuraLote[]): void {
  localStorage.setItem(CHAVE, JSON.stringify(curas));
  localStorage.setItem(CHAVE_VERSION, SCHEMA_VERSION);
}

export function listarCuras(): CuraLote[] {
  if (!isBrowser()) return [];
  // Se o schema mudou, descarta curas antigas incompatíveis
  if (localStorage.getItem(CHAVE_VERSION) !== SCHEMA_VERSION) {
    localStorage.removeItem(CHAVE);
    localStorage.setItem(CHAVE_VERSION, SCHEMA_VERSION);
    return [];
  }
  const raw = localStorage.getItem(CHAVE);
  if (!raw) return [];
  // Migração defensiva para campos adicionados após a criação
  return (JSON.parse(raw) as CuraLote[]).map((c) => ({
    ...c,
    parametros:          c.parametros          ?? PARAMETROS_PADRAO,
    temperaturaAtual:    c.temperaturaAtual     ?? null,
    umidadeAtual:        c.umidadeAtual         ?? null,
    estadoBomba:         c.estadoBomba          ?? "desligada",
    historico:           c.historico            ?? [],
    historicoIrrigacao:  c.historicoIrrigacao   ?? [],
  }));
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
    // Copia os parâmetros da receita no momento do início — snapshot imutável
    parametros: receita.parametrosCura,
    temperaturaAtual: null,
    umidadeAtual: null,
    estadoBomba: "desligada",
    historico: [],
    historicoIrrigacao: [],
  };

  const curas = listarCuras();
  salvarCuras([...curas, cura]);
  return cura;
}

export function atualizarCura(id: string, dados: Partial<CuraLote>): void {
  const curas = listarCuras().map((c) =>
    c.id === id ? { ...c, ...dados } : c
  );
  salvarCuras(curas);
}

export function finalizarCura(id: string): void {
  atualizarCura(id, { status: "concluida" });
}

export function excluirCura(id: string): void {
  const curas = listarCuras().filter((c) => c.id !== id);
  salvarCuras(curas);
}

// Registra uma leitura do DHT22 (real ou simulada).
// Atualiza o snapshot e o histórico circular (máx. 200 leituras).
export function registrarLeitura(
  curaId: string,
  dados: { temperatura: number; umidade: number; estadoBomba: EstadoBomba }
): void {
  const curas = listarCuras();
  const atualizadas = curas.map((c) => {
    if (c.id !== curaId) return c;

    const leitura: LeituraCamara = {
      id: gerarId(),
      curaId,
      timestamp: new Date().toISOString(),
      temperatura: dados.temperatura,
      umidade: dados.umidade,
      estadoBomba: dados.estadoBomba,
    };

    return {
      ...c,
      temperaturaAtual: dados.temperatura,
      umidadeAtual: dados.umidade,
      estadoBomba: dados.estadoBomba,
      historico: [...c.historico, leitura].slice(-200),
    };
  });
  salvarCuras(atualizadas);
}

// Registra um acionamento da bomba no histórico de irrigação.
export function registrarIrrigacao(
  curaId: string,
  dados: {
    duracaoSegundos: number;
    volumeEstimadoMl: number;
    origem: EventoBomba["origem"];
  }
): void {
  const curas = listarCuras();
  const atualizadas = curas.map((c) => {
    if (c.id !== curaId) return c;

    const evento: EventoBomba = {
      id: gerarId(),
      curaId,
      timestamp: new Date().toISOString(),
      duracaoSegundos: dados.duracaoSegundos,
      volumeEstimadoMl: dados.volumeEstimadoMl,
      origem: dados.origem,
    };

    return {
      ...c,
      historicoIrrigacao: [...c.historicoIrrigacao, evento].slice(-100),
    };
  });
  salvarCuras(atualizadas);
}

export function listarCurasAtivas(): CuraLote[] {
  return listarCuras().filter((c) => c.status === "em_cura");
}

// Verifica curas cujo tempo de cura expirou e as move para "concluida" automaticamente.
export function verificarCurasVencidas(): void {
  const agora = new Date();
  const curas = listarCuras();
  const atualizadas = curas.map((c) => {
    if (c.status !== "em_cura") return c;
    const venceu = new Date(c.previsaoFim) <= agora;
    // Usa "interrompida" não — prazo vencido é estado de alerta, não interrupção
    return venceu ? { ...c, status: "concluida" as StatusCura } : c;
  });
  salvarCuras(atualizadas);
}
