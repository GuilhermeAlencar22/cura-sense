export type TipoConcreto =
  | "convencional"
  | "armado"
  | "usinado"
  | "bombeavel"
  | "protendido"
  | "alta_resistencia"
  | "leve"
  | "autoadensavel";

export type TipoPeca = "pia" | "vaso" | "bancada" | "pilar" | "laje" | "outro";

export type StatusCura = "ativa" | "pausada" | "finalizada" | "alerta";

// Receita: template reutilizável definido pelo usuário
export type Receita = {
  id: string;
  nome: string;
  tipoPeca: TipoPeca;
  tipoConcreto: TipoConcreto;
  volumeM3: number;
  objetivoFinal: string;
  diasCura: number;
  aguaBaseMl: number;
  vazaoBombaMlSegundo: number;
  criadaEm: string;
};

// Cura: instância de uma receita em execução
export type Cura = {
  id: string;
  receitaId: string;
  nomeIdentificacao: string;
  inicioCura: string;
  status: StatusCura;
  temperaturaAtual: number;
  umidadeAtual: number;
  aguaTotalUsadaMl: number;
  historico: LeituraSensor[];
};

export type LeituraSensor = {
  id: string;
  curaId: string;
  temperatura: number;
  umidade: number;
  aguaAplicadaMl: number;
  bombaAcionada: boolean;
  dataHora: string;
};

export type ResultadoCalculo = {
  aguaPorCicloMl: number;
  fatorUmidade: number;
  fatorTemperatura: number;
  classificacaoUmidade: "alta" | "media" | "baixa";
  classificacaoTemperatura: "alta" | "media" | "baixa";
  tempoBombaSegundos: number;
};

export type Usuario = {
  email: string;
  nome: string;
};
