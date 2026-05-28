"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fazerLogin } from "@/services/usuarioService";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");

    if (!email || !senha) {
      setErro("Preencha e-mail e senha para continuar.");
      return;
    }

    setLoading(true);
    // Simula um delay de autenticação para realismo
    setTimeout(() => {
      fazerLogin(email);
      router.push("/dashboard");
    }, 800);
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>💧</span>
            <span className={styles.logoText}>CuraSense</span>
          </div>
          <h1 className={styles.headline}>
            Monitoramento inteligente da cura do concreto
          </h1>
          <p className={styles.description}>
            Controle temperatura, umidade e hidratação das suas peças de
            concreto em tempo real com precisão e simplicidade.
          </p>
          <div className={styles.features}>
            {["Simulação de ambiente", "Cálculo automático de água", "Histórico de leituras", "Receitas customizáveis"].map((f) => (
              <div key={f} className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Entrar no sistema</h2>
            <p className={styles.cardSubtitle}>
              Use qualquer e-mail e senha para acessar o protótipo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">E-mail</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="senha" className="form-label">Senha</label>
              <input
                id="senha"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button
              type="submit"
              className={`btn btn-primary btn-full ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className={styles.hint}>
            Protótipo acadêmico — Sistemas Embarcados
          </p>
        </div>
      </div>
    </div>
  );
}
