import { Pencil, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DateBadge } from "./DateBadge";
import { StatusBadge } from "./StatusBadge";

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface AppointmentCardData {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  price: string;
  professionalName: string;
  appointmentTypeName: string;
  durationMinutes: number;
}

interface AppointmentCardProps {
  appointment: AppointmentCardData;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const date = new Date(appointment.startAt);

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4">
      <DateBadge date={date} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text">{appointment.appointmentTypeName}</h3>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-text-secondary">{appointment.professionalName}</p>
            <p className="flex items-center gap-1 text-sm text-text-secondary">
              <Clock className="size-3.5" />
              {appointment.durationMinutes} min · {appointment.price}€
            </p>
          </div>

          {appointment.status === "completed" && (
            <div className="flex shrink-0 gap-2 pb-1">
              <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
                <Pencil className="size-3.5" />
                Editar Datos
              </Button>
              <Button className="gap-1.5 px-3 py-1.5 text-xs">
                <Download className="size-3.5" />
                Factura
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
