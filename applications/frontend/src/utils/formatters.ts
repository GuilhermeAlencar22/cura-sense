import { TipoConcreto, TipoPeca, StatusCura, StatusConformidade } from "@/types";

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

export function calcularDiasRestantes(previsaoFim: string): number {
  const fim = new Date(previsaoFim).getTime();
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
    uhpc: "UHPC",
    convencional: "Convencional",
    armado: "Armado",
    alta_resistencia: "Alta Resistência",
  };
  return labels[tipo] ?? tipo;
}

export function labelTipoPeca(tipo: TipoPeca): string {
  const labels: Record<TipoPeca, string> = {
    cuba_colorida: "Cuba Colorida",
    escalda_pes: "Escalda-Pés",
    pia_gourmet: "Pia Gourmet",
    bancada: "Bancada",
    vaso: "Vaso",
    outro: "Outro",
  };
  return labels[tipo] ?? tipo;
}

export function labelStatus(status: StatusCura): string {
  const labels: Record<StatusCura, string> = {
    em_cura: "Em Cura",
    finalizada: "Finalizada",
    alerta: "Alerta",
    cancelada: "Cancelada",
  };
  return labels[status] ?? status;
}

export function labelAmbienteCura(ambiente: string): string {
  const labels: Record<string, string> = {
    camara_cura: "Câmara de Cura",
    camara_umida: "Câmara Úmida",
    exposto: "Exposto",
  };
  return labels[ambiente] ?? ambiente;
}

export function labelConformidade(conformidade: StatusConformidade): string {
  const labels: Record<StatusConformidade, string> = {
    conforme: "Conforme",
    desvio_leve: "Desvio Leve",
    desvio_critico: "Desvio Crítico",
  };
  return labels[conformidade] ?? conformidade;
}
