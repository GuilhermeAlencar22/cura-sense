import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CuraSense — Monitoramento inteligente da cura do concreto",
  description: "Plataforma de monitoramento e simulação da cura do concreto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
