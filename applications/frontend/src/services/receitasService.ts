import { ReceitaTraco, ParametrosCura } from "@/types";
import { gerarId } from "@/utils/formatters";

const CHAVE = "curasense_receitas";

// Parâmetros de cura padrão para câmara úmida UHPC.
// Temperatura 20–25°C e umidade ≥ 85% são referências bibliográficas conservadoras.
const PARAMETROS_PADRAO: ParametrosCura = {
  temperaturaIdealMin: 20,
  temperaturaIdealMax: 25,
  umidadeIdealMin: 85,
  umidadeIdealMax: 100,
  modoControle: "automatico",
  regraIrrigacao: {
    vazaoMlPorSegundo: 2.0,
    mlPorAcionamento: 5,
    duracaoSegundos: 2.5,   // 5 ml / 2.0 ml·s⁻¹
    intervaloMinutos: 60,
    umidadeMinima: 85,
  },
};

const RECEITAS_INICIAIS: ReceitaTraco[] = [
  {
    id: "receita-cuba-colorida",
    nome: "Cuba Colorida UHPC",
    tipoPeca: "cuba_colorida",
    tipoConcreto: "uhpc",
    massaCimento: 1000,
    massaAgregado: 800,
    massaPigmento: 30,
    massaAditivos: 15,
    massaAgua: 180,
    relacaoAguaCimento: 0.18,
    relacaoMassaAgregado: 1.25,
    diasCura: 7,
    ambienteCura: "camara_cura",
    parametrosCura: PARAMETROS_PADRAO,
    observacoes:
      "Peça decorativa colorida. Atenção ao pigmento: variação de mais de 2 g altera a cor final.",
    criadaEm: new Date().toISOString(),
  },
  {
    id: "receita-escalda-pes",
    nome: "Escalda-Pés Fino UHPC",
    tipoPeca: "escalda_pes",
    tipoConcreto: "uhpc",
    massaCimento: 1200,
    massaAgregado: 900,
    massaPigmento: 0,
    massaAditivos: 20,
    massaAgua: 200,
    relacaoAguaCimento: 0.167,
    relacaoMassaAgregado: 1.333,
    diasCura: 7,
    ambienteCura: "camara_cura",
    parametrosCura: PARAMETROS_PADRAO,
    observacoes:
      "Peça de parede fina — risco de trinca aumenta com desvio na relação A/C acima de 5%.",
    criadaEm: new Date().toISOString(),
  },
  {
    id: "receita-pia-gourmet",
    nome: "Pia Gourmet UHPC",
    tipoPeca: "pia_gourmet",
    tipoConcreto: "uhpc",
    massaCimento: 1500,
    massaAgregado: 1200,
    massaPigmento: 0,
    massaAditivos: 25,
    massaAgua: 240,
    relacaoAguaCimento: 0.16,
    relacaoMassaAgregado: 1.25,
    diasCura: 7,
    ambienteCura: "camara_cura",
    parametrosCura: PARAMETROS_PADRAO,
    observacoes:
      "Peça de grande porte. Manter constância da dosagem entre lotes para uniformidade visual.",
    criadaEm: new Date().toISOString(),
  },
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function listarReceitas(): ReceitaTraco[] {
  if (!isBrowser()) return RECEITAS_INICIAIS;
  const raw = localStorage.getItem(CHAVE);
  if (!raw) {
    localStorage.setItem(CHAVE, JSON.stringify(RECEITAS_INICIAIS));
    return RECEITAS_INICIAIS;
  }
  // Migração defensiva: garante que receitas antigas sem parametrosCura recebam o padrão
  const receitas = JSON.parse(raw) as ReceitaTraco[];
  return receitas.map((r) =>
    r.parametrosCura ? r : { ...r, parametrosCura: PARAMETROS_PADRAO }
  );
}

export function buscarReceita(id: string): ReceitaTraco | undefined {
  return listarReceitas().find((r) => r.id === id);
}

export function salvarReceita(
  dados: Omit<ReceitaTraco, "id" | "criadaEm">
): ReceitaTraco {
  const receitas = listarReceitas();
  const nova: ReceitaTraco = {
    ...dados,
    id: gerarId(),
    criadaEm: new Date().toISOString(),
  };
  localStorage.setItem(CHAVE, JSON.stringify([...receitas, nova]));
  return nova;
}

export function atualizarReceita(
  id: string,
  dados: Partial<ReceitaTraco>
): void {
  const receitas = listarReceitas().map((r) =>
    r.id === id ? { ...r, ...dados } : r
  );
  localStorage.setItem(CHAVE, JSON.stringify(receitas));
}

export function excluirReceita(id: string): void {
  const receitas = listarReceitas().filter((r) => r.id !== id);
  localStorage.setItem(CHAVE, JSON.stringify(receitas));
}

export { PARAMETROS_PADRAO };
