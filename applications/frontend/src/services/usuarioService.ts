import { Usuario } from "@/types";

const CHAVE = "curasense_usuario";

export function fazerLogin(email: string): void {
  const nome = email.split("@")[0].replace(/[._]/g, " ");
  const usuario: Usuario = { email, nome };
  localStorage.setItem(CHAVE, JSON.stringify(usuario));
}

export function obterUsuario(): Usuario | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CHAVE);
  return raw ? (JSON.parse(raw) as Usuario) : null;
}

export function fazerLogout(): void {
  localStorage.removeItem(CHAVE);
}

export function estaAutenticado(): boolean {
  return obterUsuario() !== null;
}
