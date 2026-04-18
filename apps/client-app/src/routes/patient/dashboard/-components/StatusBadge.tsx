import { Badge } from "@fisio-app/ui";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; variant: "info" | "success" | "neutral" | "danger" }
> = {
  scheduled: { label: "Programada", variant: "info" },
  completed: { label: "Completada", variant: "success" },
  cancelled: { label: "Cancelada", variant: "neutral" },
  no_show: { label: "No Asistió", variant: "danger" },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = statusConfig[status];
  return <Badge variant={variant}>{label}</Badge>;
}
