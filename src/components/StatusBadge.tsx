import { StatusCura } from "@/types";

const config: Record<StatusCura, { label: string; cls: string }> = {
  em_cura: { label: "Em Cura", cls: "badge badge-blue" },
  finalizada: { label: "Finalizada", cls: "badge badge-green" },
  alerta: { label: "Alerta", cls: "badge badge-red" },
  cancelada: { label: "Cancelada", cls: "badge badge-yellow" },
};

export default function StatusBadge({ status }: { status: StatusCura }) {
  const { label, cls } = config[status] ?? { label: status, cls: "badge" };
  return <span className={cls}>{label}</span>;
}
