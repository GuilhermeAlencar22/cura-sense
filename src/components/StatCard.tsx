import styles from "./StatCard.module.css";

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  icon: string;
  variant?: "default" | "green" | "yellow" | "red" | "blue";
};

export default function StatCard({ label, value, unit, icon, variant = "default" }: Props) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>
          {value}
          {unit && <span className={styles.unit}>{unit}</span>}
        </p>
      </div>
    </div>
  );
}
