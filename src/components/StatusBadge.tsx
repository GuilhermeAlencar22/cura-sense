import { StatusCura } from "@/types";

const config: Record<StatusCura, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge badge-blue" },
  pausada: { label: "Pausada", cls: "badge badge-yellow" },
  finalizada: { label: "Finalizada", cls: "badge badge-green" },
  alerta: { label: "Alerta", cls: "badge badge-red" },
};

export default function StatusBadge({ status }: { status: StatusCura }) {
  const { label, cls } = config[status];
  return <span className={cls}>{label}</span>;
}
