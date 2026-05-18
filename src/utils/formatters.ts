import { TipoConcreto, TipoPeca, StatusCura } from "@/types";

export function formatarData(isoString: string): string {
  return new Date(isoString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarDataCurta(isoString: string): string {
  return new Date(isoString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function calcularDiasRestantes(inicioCura: string, diasCura: number): number {
  const inicio = new Date(inicioCura).getTime();
  const fim = inicio + diasCura * 24 * 60 * 60 * 1000;
  const restante = Math.ceil((fim - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, restante);
}

export function calcularProgresso(inicioCura: string, diasCura: number): number {
  const inicio = new Date(inicioCura).getTime();
  const duracao = diasCura * 24 * 60 * 60 * 1000;
  const decorrido = Date.now() - inicio;
  return Math.min(100, Math.max(0, Math.round((decorrido / duracao) * 100)));
}

export function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function labelTipoConcreto(tipo: TipoConcreto): string {
  const labels: Record<TipoConcreto, string> = {
    convencional: "Convencional",
    armado: "Armado",
    usinado: "Usinado",
    bombeavel: "Bombeável",
    protendido: "Protendido",
    alta_resistencia: "Alta Resistência",
    leve: "Leve",
    autoadensavel: "Autoadensável",
  };
  return labels[tipo];
}

export function labelTipoPeca(tipo: TipoPeca): string {
  const labels: Record<TipoPeca, string> = {
    pia: "Pia",
    vaso: "Vaso",
    bancada: "Bancada",
    pilar: "Pilar",
    laje: "Laje",
    outro: "Outro",
  };
  return labels[tipo];
}

export function labelStatus(status: StatusCura): string {
  const labels: Record<StatusCura, string> = {
    ativa: "Ativa",
    pausada: "Pausada",
    finalizada: "Finalizada",
    alerta: "Alerta",
  };
  return labels[status];
}
