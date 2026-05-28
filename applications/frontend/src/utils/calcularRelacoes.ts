import { ResultadoRelacoes, StatusConformidade } from "@/types";

type ParamsRelacoes = {
  massaCimento: number;
  massaAgregado: number;
  massaAgua: number;
};

type ParamsDesvio = ParamsRelacoes & {
  massaCimentoPadrao: number;
  massaAgregadoPadrao: number;
  massaAguaPadrao: number;
};

export function calcularRelacoes({ massaCimento, massaAgregado, massaAgua }: ParamsRelacoes) {
  return {
    relacaoAguaCimento: massaCimento > 0 ? massaAgua / massaCimento : 0,
    relacaoMassaAgregado: massaAgregado > 0 ? massaCimento / massaAgregado : 0,
  };
}

export function calcularDesvio(real: number, padrao: number): number {
  if (padrao === 0) return 0;
  return Math.round(((real - padrao) / padrao) * 100 * 10) / 10;
}

function classificarConformidade(desvioAC: number, desvioMA: number): StatusConformidade {
  const maxDesvio = Math.max(Math.abs(desvioAC), Math.abs(desvioMA));
  if (maxDesvio <= 3) return "conforme";
  if (maxDesvio <= 8) return "desvio_leve";
  return "desvio_critico";
}

export function calcularRelacoesDosagem({
  massaCimento,
  massaAgregado,
  massaAgua,
  massaCimentoPadrao,
  massaAgregadoPadrao,
  massaAguaPadrao,
}: ParamsDesvio): ResultadoRelacoes {
  const relacaoAguaCimento = massaCimento > 0 ? massaAgua / massaCimento : 0;
  const relacaoMassaAgregado = massaAgregado > 0 ? massaCimento / massaAgregado : 0;

  const acPadrao = massaCimentoPadrao > 0 ? massaAguaPadrao / massaCimentoPadrao : 0;
  const maPadrao = massaAgregadoPadrao > 0 ? massaCimentoPadrao / massaAgregadoPadrao : 0;

  const desvioPercentualAC = calcularDesvio(relacaoAguaCimento, acPadrao);
  const desvioPercentualMA = calcularDesvio(relacaoMassaAgregado, maPadrao);

  return {
    relacaoAguaCimento: Math.round(relacaoAguaCimento * 1000) / 1000,
    relacaoMassaAgregado: Math.round(relacaoMassaAgregado * 1000) / 1000,
    desvioPercentualAC,
    desvioPercentualMA,
    conformidade: classificarConformidade(desvioPercentualAC, desvioPercentualMA),
  };
}
