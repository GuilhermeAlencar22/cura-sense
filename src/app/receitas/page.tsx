"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  listarReceitas,
  salvarReceita,
  atualizarReceita,
  excluirReceita,
} from "@/services/receitasService";
import { Receita } from "@/types";
import { labelTipoConcreto, labelTipoPeca } from "@/utils/formatters";
import ReceitaModal from "./ReceitaModal";
import styles from "./receitas.module.css";

export default function ReceitasPage() {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [modal, setModal] = useState<{ aberto: boolean; receita?: Receita }>({
    aberto: false,
  });

  function recarregar() {
    setReceitas(listarReceitas());
  }

  useEffect(() => {
    recarregar();
  }, []);

  function handleSalvar(dados: Omit<Receita, "id" | "criadaEm">, id?: string) {
    if (id) {
      atualizarReceita(id, dados);
    } else {
      salvarReceita(dados);
    }
    recarregar();
    setModal({ aberto: false });
  }

  function handleExcluir(id: string) {
    if (confirm("Deseja excluir esta receita? As curas existentes não serão afetadas.")) {
      excluirReceita(id);
      recarregar();
    }
  }

  return (
    <AppShell>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Receitas</h1>
          <p className="page-subtitle">
            Templates reutilizáveis para iniciar novas curas.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ aberto: true })}>
          + Nova Receita
        </button>
      </div>

      {receitas.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: "2.5rem" }}>✦</span>
          <p>Nenhuma receita cadastrada ainda.</p>
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
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModal({ aberto: true, receita })}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleExcluir(receita.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <h3 className={styles.cardTitle}>{receita.nome}</h3>

              {receita.objetivoFinal && (
                <p className={styles.objetivo}>{receita.objetivoFinal}</p>
              )}

              <div className={styles.params}>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Volume</span>
                  <span className={styles.paramValue}>{receita.volumeM3} m³</span>
                </div>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Dias de cura</span>
                  <span className={styles.paramValue}>{receita.diasCura} dias</span>
                </div>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Água base/ciclo</span>
                  <span className={styles.paramValue}>{receita.aguaBaseMl} ml</span>
                </div>
                <div className={styles.param}>
                  <span className={styles.paramLabel}>Vazão da bomba</span>
                  <span className={styles.paramValue}>{receita.vazaoBombaMlSegundo} ml/s</span>
                </div>
              </div>

              <Link
                href={`/curas/nova?receitaId=${receita.id}`}
                className={`btn btn-primary btn-full ${styles.iniciarBtn}`}
              >
                ▶ Iniciar Cura
              </Link>
            </div>
          ))}
        </div>
      )}

      {modal.aberto && (
        <ReceitaModal
          receita={modal.receita}
          onSalvar={handleSalvar}
          onFechar={() => setModal({ aberto: false })}
        />
      )}
    </AppShell>
  );
}
