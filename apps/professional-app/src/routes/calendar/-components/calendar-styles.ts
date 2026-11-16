import type { AppointmentStatus } from "@fisio-app/ui/StatusBadge";

/** Colors shared by the calendar blocks and the legend. */
export const APPOINTMENT_STYLES: Record<
  Exclude<AppointmentStatus, "cancelled">,
  { label: string; block: string; swatch: string }
> = {
  scheduled: {
    label: "Programada",
    block: "border-primary-400 bg-primary-50 text-primary-800 hover:bg-primary-100",
    swatch: "border-primary-400 bg-primary-100",
  },
  completed: {
    label: "Completada",
    block: "border-green-400 bg-green-50 text-green-800 hover:bg-green-100",
    swatch: "border-green-400 bg-green-100",
  },
  no_show: {
    label: "No Asistió",
    block: "border-red-300 bg-status-noshow-bg text-status-noshow-text hover:bg-red-200",
    swatch: "border-red-300 bg-status-noshow-bg",
  },
};

export const BLOCKED_STYLE = {
  label: "Bloqueado",
  block: "border-gray-400 bg-gray-100 text-text-secondary",
  swatch: "border-gray-400 bg-gray-200",
};
