"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fazerLogout } from "@/services/usuarioService";
import styles from "./Sidebar.module.css";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/receitas", label: "Receitas", icon: "✦" },
  { href: "/producao", label: "Produção", icon: "⊕" },
  { href: "/curas", label: "Curas", icon: "⟳" },
  { href: "/simulador", label: "Simulador", icon: "◉" },
  { href: "/historico", label: "Histórico", icon: "☰" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    fazerLogout();
    router.push("/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>💧</span>
        <div>
          <p className={styles.brandName}>CuraSense</p>
          <p className={styles.brandSlogan}>Cura inteligente</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {navLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            >
              <span className={styles.navIcon}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <span>⎋</span> Sair
        </button>
      </div>
    </aside>
  );
}
