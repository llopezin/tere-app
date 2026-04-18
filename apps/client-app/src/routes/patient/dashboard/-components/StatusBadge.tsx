import { Badge } from "@/components/ui/Badge";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; variant: "blue" | "green" | "gray" | "red" }
> = {
  scheduled: { label: "Programada", variant: "blue" },
  completed: { label: "Completada", variant: "green" },
  cancelled: { label: "Cancelada", variant: "gray" },
  no_show: { label: "No Asistió", variant: "red" },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = statusConfig[status];
  return <Badge variant={variant}>{label}</Badge>;
}
