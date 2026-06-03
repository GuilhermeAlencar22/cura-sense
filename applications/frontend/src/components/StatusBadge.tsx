import { StatusCura } from "@/types";

const config: Record<StatusCura, { label: string; cls: string }> = {
  aguardando:   { label: "Aguardando",   cls: "badge badge-yellow" },
  em_cura:      { label: "Em Cura",      cls: "badge badge-blue"   },
  concluida:    { label: "Concluída",    cls: "badge badge-green"  },
  interrompida: { label: "Interrompida", cls: "badge badge-red"    },
};

export default function StatusBadge({ status }: { status: StatusCura }) {
  const { label, cls } = config[status] ?? { label: status, cls: "badge" };
  return <span className={cls}>{label}</span>;
}
