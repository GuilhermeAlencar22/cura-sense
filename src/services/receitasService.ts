import { Receita } from "@/types";
import { gerarId } from "@/utils/formatters";

const CHAVE = "curasense_receitas";

const RECEITAS_INICIAIS: Receita[] = [
  {
    id: "receita-leve",
    nome: "Cura Leve — Vaso Convencional",
    tipoPeca: "vaso",
    tipoConcreto: "convencional",
    volumeM3: 0.02,
    objetivoFinal: "Peça decorativa resistente a intempéries",
    diasCura: 14,
    aguaBaseMl: 300,
    vazaoBombaMlSegundo: 5,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "receita-media",
    nome: "Cura Média — Bancada Armada",
    tipoPeca: "bancada",
    tipoConcreto: "armado",
    volumeM3: 0.08,
    objetivoFinal: "Bancada estrutural com resistência mínima de 25 MPa",
    diasCura: 28,
    aguaBaseMl: 600,
    vazaoBombaMlSegundo: 8,
    criadaEm: new Date().toISOString(),
  },
  {
    id: "receita-intensa",
    nome: "Cura Intensa — Pilar Alta Resistência",
    tipoPeca: "pilar",
    tipoConcreto: "alta_resistencia",
    volumeM3: 0.2,
    objetivoFinal: "Elemento estrutural com resistência acima de 50 MPa",
    diasCura: 28,
    aguaBaseMl: 1000,
    vazaoBombaMlSegundo: 12,
    criadaEm: new Date().toISOString(),
  },
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function listarReceitas(): Receita[] {
  if (!isBrowser()) return RECEITAS_INICIAIS;
  const raw = localStorage.getItem(CHAVE);
  if (!raw) {
    localStorage.setItem(CHAVE, JSON.stringify(RECEITAS_INICIAIS));
    return RECEITAS_INICIAIS;
  }
  return JSON.parse(raw) as Receita[];
}

export function buscarReceita(id: string): Receita | undefined {
  return listarReceitas().find((r) => r.id === id);
}

export function salvarReceita(dados: Omit<Receita, "id" | "criadaEm">): Receita {
  const receitas = listarReceitas();
  const nova: Receita = { ...dados, id: gerarId(), criadaEm: new Date().toISOString() };
  localStorage.setItem(CHAVE, JSON.stringify([...receitas, nova]));
  return nova;
}

export function atualizarReceita(id: string, dados: Partial<Receita>): void {
  const receitas = listarReceitas().map((r) => (r.id === id ? { ...r, ...dados } : r));
  localStorage.setItem(CHAVE, JSON.stringify(receitas));
}

export function excluirReceita(id: string): void {
  const receitas = listarReceitas().filter((r) => r.id !== id);
  localStorage.setItem(CHAVE, JSON.stringify(receitas));
}
