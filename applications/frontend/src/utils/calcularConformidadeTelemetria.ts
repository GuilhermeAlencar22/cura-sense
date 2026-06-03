import { ParametrosCura, StatusConformidadeTelemetria } from "@/types";

// Tolerância percentual da faixa para classificar como desvio_leve antes de crítico.
// Ex: faixa 20–25°C com 5% de tolerância → desvio_leve entre 18.75–20 e 25–26.25°C
const TOLERANCIA = 0.05;

export function avaliarConformidade(
  valor: number,
  min: number,
  max: number
): StatusConformidadeTelemetria {
  if (valor >= min && valor <= max) return "conforme";
  const margem = (max - min) * TOLERANCIA;
  if (valor >= min - margem && valor <= max + margem) return "desvio_leve";
  return "desvio_critico";
}

export type ConformanciaLeitura = {
  temperatura: StatusConformidadeTelemetria;
  umidade: StatusConformidadeTelemetria;
  geral: StatusConformidadeTelemetria;
};

// Prioridade: desvio_critico > desvio_leve > conforme > sem_dados
function piorStatus(
  a: StatusConformidadeTelemetria,
  b: StatusConformidadeTelemetria
): StatusConformidadeTelemetria {
  const ordem: StatusConformidadeTelemetria[] = [
    "conforme",
    "desvio_leve",
    "desvio_critico",
    "sem_dados",
  ];
  return ordem.indexOf(a) >= ordem.indexOf(b) ? a : b;
}

export function avaliarLeitura(
  temperatura: number,
  umidade: number,
  parametros: ParametrosCura
): ConformanciaLeitura {
  const t = avaliarConformidade(
    temperatura,
    parametros.temperaturaIdealMin,
    parametros.temperaturaIdealMax
  );
  const u = avaliarConformidade(
    umidade,
    parametros.umidadeIdealMin,
    parametros.umidadeIdealMax
  );
  return { temperatura: t, umidade: u, geral: piorStatus(t, u) };
}

export function labelConformidadeTelemetria(
  status: StatusConformidadeTelemetria
): string {
  const labels: Record<StatusConformidadeTelemetria, string> = {
    conforme: "Conforme",
    desvio_leve: "Desvio leve",
    desvio_critico: "Desvio crítico",
    sem_dados: "Sem dados",
  };
  return labels[status];
}
