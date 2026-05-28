"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { listarReceitas, excluirReceita } from "@/services/receitasService";
import { ReceitaTraco } from "@/types";
import {
  labelTipoPeca,
  labelTipoConcreto,
  labelAmbienteCura,
  formatarDataCurta,
} from "@/utils/formatters";
import styles from "./receitas.module.css";

export default function ReceitasPage() {
  const [receitas, setReceitas] = useState<ReceitaTraco[]>([]);

  useEffect(() => {
    setReceitas(listarReceitas());
  }, []);

  function handleExcluir(id: string) {
    if (confirm("Excluir esta receita? Os lotes existentes não serão afetados.")) {
      excluirReceita(id);
      setReceitas(listarReceitas());
    }
  }

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Receitas de Traço</h1>
          <p className="page-subtitle">
            Templates de dosagem padrão para peças de concreto UHPC.
          </p>
        </div>
        <Link href="/receitas/nova" className="btn btn-primary">
          + Nova Receita
        </Link>
      </div>

      {receitas.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: "2.5rem" }}>✦</span>
          <p>Nenhuma receita cadastrada ainda.</p>
          <Link href="/receitas/nova" className="btn btn-primary" style={{ marginTop: "16px" }}>
            Cadastrar primeira receita
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {receitas.map((receita) => (
            <div key={receita.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.badges}>
                  <span className="badge badge-blue">{labelTipoPeca(receita.tipoPeca)}</span>
                  <span className="badge badge-yellow">{labelTipoConcreto(receita.tipoConcreto)}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleExcluir(receita.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <h3 className={styles.cardTitle}>{receita.nome}</h3>

              <div className={styles.params}>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>A/C</span>
                  <span className={styles.paramValue}>{receita.relacaoAguaCimento.toFixed(3)}</span>
                </div>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Cim./Agr.</span>
                  <span className={styles.paramValue}>{receita.relacaoMassaAgregado.toFixed(3)}</span>
                </div>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Cura</span>
                  <span className={styles.paramValue}>{receita.diasCura} dias</span>
                </div>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Ambiente</span>
                  <span className={styles.paramValue}>{labelAmbienteCura(receita.ambienteCura)}</span>
                </div>
              </div>

              {receita.observacoes && (
                <p className={styles.observacoes}>{receita.observacoes}</p>
              )}

              <div className={styles.cardFooter}>
                <span className={styles.dataCriacao}>
                  Criada em {formatarDataCurta(receita.criadaEm)}
                </span>
                <Link
                  href={`/producao/nova?receitaId=${receita.id}`}
                  className="btn btn-primary btn-sm"
                >
                  ▶ Produzir
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
