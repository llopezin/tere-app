import { cn } from "@fisio-app/ui/lib/cn";
import type { CalendarAppointment } from "@/api/calendar-appointments";
import { APPOINTMENT_STYLES } from "./calendar-styles";
import { SLOT_HEIGHT_PX } from "./calendar-layout";

interface AppointmentBlockProps {
  appointment: CalendarAppointment;
  position: { top: number; height: number };
  onSelect: (appointment: CalendarAppointment) => void;
}

export function AppointmentBlock({ appointment, position, onSelect }: AppointmentBlockProps) {
  const isCompact = position.height <= SLOT_HEIGHT_PX;

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      title={`${appointment.patientName} · ${appointment.appointmentTypeName}`}
      style={{ top: position.top, height: position.height }}
      className={cn(
        "absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-l-4 px-1.5 text-left text-xs transition-colors md:px-2",
        isCompact ? "flex items-center" : "py-1",
        APPOINTMENT_STYLES[appointment.status].block,
      )}
    >
      <p className="truncate font-medium">{appointment.patientName}</p>
      {!isCompact && <p className="truncate">{appointment.appointmentTypeName}</p>}
    </button>
  );
}
