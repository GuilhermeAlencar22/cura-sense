import { ResultadoCalculo } from "@/types";

type Params = {
  aguaBaseMl: number;
  vazaoBombaMlSegundo: number;
  temperatura: number;
  umidade: number;
};

export function calcularAguaPorCiclo({
  aguaBaseMl,
  vazaoBombaMlSegundo,
  temperatura,
  umidade,
}: Params): ResultadoCalculo {
  // Fator de umidade
  let fatorUmidade: number;
  let classificacaoUmidade: ResultadoCalculo["classificacaoUmidade"];

  if (umidade > 80) {
    fatorUmidade = 0.6;
    classificacaoUmidade = "alta";
  } else if (umidade >= 60) {
    fatorUmidade = 1.0;
    classificacaoUmidade = "media";
  } else {
    fatorUmidade = 1.4;
    classificacaoUmidade = "baixa";
  }

  // Fator de temperatura
  let fatorTemperatura: number;
  let classificacaoTemperatura: ResultadoCalculo["classificacaoTemperatura"];

  if (temperatura < 24) {
    fatorTemperatura = 0.9;
    classificacaoTemperatura = "baixa";
  } else if (temperatura <= 30) {
    fatorTemperatura = 1.0;
    classificacaoTemperatura = "media";
  } else {
    fatorTemperatura = 1.3;
    classificacaoTemperatura = "alta";
  }

  const aguaPorCicloMl = aguaBaseMl * fatorUmidade * fatorTemperatura;
  const tempoBombaSegundos = aguaPorCicloMl / vazaoBombaMlSegundo;

  return {
    aguaPorCicloMl: Math.round(aguaPorCicloMl),
    fatorUmidade,
    fatorTemperatura,
    classificacaoUmidade,
    classificacaoTemperatura,
    tempoBombaSegundos: Math.round(tempoBombaSegundos * 10) / 10,
  };
}
