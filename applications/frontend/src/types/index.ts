// Tipos de peça produzida pela cliente (concreto decorativo UHPC)
export type TipoPeca =
  | "cuba_colorida"
  | "escalda_pes"
  | "pia_gourmet"
  | "bancada"
  | "vaso"
  | "outro";

// Apenas UHPC é o foco do sistema; outros tipos ficam disponíveis para expansão
export type TipoConcreto = "uhpc" | "convencional" | "armado" | "alta_resistencia";

export type StatusCura = "em_cura" | "finalizada" | "alerta" | "cancelada";

export type StatusConformidade = "conforme" | "desvio_leve" | "desvio_critico";

// Receita: template reutilizável de traço para uma peça específica
export type ReceitaTraco = {
  id: string;
  nome: string;
  tipoPeca: TipoPeca;
  tipoConcreto: TipoConcreto;
  // Dosagem padrão (em gramas)
  massaCimento: number;
  massaAgregado: number;
  massaPigmento: number;
  massaAditivos: number;
  massaAgua: number;
  // Relações calculadas (armazenadas para consulta rápida)
  relacaoAguaCimento: number;
  relacaoMassaAgregado: number;
  // Cura
  diasCura: number;
  ambienteCura: "camara_cura" | "camara_umida" | "exposto";
  observacoes: string;
  criadaEm: string;
};

// Lote: registro de uma produção real usando uma receita
export type LoteProducao = {
  id: string;
  receitaId: string;
  nomeIdentificacao: string;
  quantidadePecas: number;
  // Dosagem real usada (em gramas)
  massaCimentoReal: number;
  massaAgregadoReal: number;
  massaPigmentoReal: number;
  massaAditivosReal: number;
  massaAguaReal: number;
  // Relações reais calculadas
  relacaoAguaCimentoReal: number;
  relacaoMassaAgregadoReal: number;
  // Conformidade comparada com a receita padrão
  conformidade: StatusConformidade;
  desvioPercentualAC: number;
  desvioPercentualMA: number;
  observacoes: string;
  criadoEm: string;
};

// Cura: acompanhamento do lote durante os dias de cura
export type CuraLote = {
  id: string;
  loteId: string;
  receitaId: string;
  inicioCura: string;
  previsaoFim: string;
  status: StatusCura;
  temperaturaTanque: number | null;
  temperaturaAmbiente: number | null;
  nivelAguaTanque: "ok" | "baixo" | "critico" | null;
  historico: LeituraSensor[];
};

// Leitura periódica vinda do ESP32 (ou simulada na Fase 1)
export type LeituraSensor = {
  id: string;
  curaId: string;
  temperaturaTanque: number | null;
  temperaturaAmbiente: number | null;
  nivelAguaTanque: "ok" | "baixo" | "critico" | null;
  dataHora: string;
};

// Resultado do cálculo de relações de traço
export type ResultadoRelacoes = {
  relacaoAguaCimento: number;
  relacaoMassaAgregado: number;
  desvioPercentualAC: number;
  desvioPercentualMA: number;
  conformidade: StatusConformidade;
};

export type Usuario = {
  email: string;
  nome: string;
};
