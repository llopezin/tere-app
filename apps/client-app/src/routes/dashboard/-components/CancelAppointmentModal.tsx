import { Modal } from "@fisio-app/ui";
import { Button } from "@fisio-app/ui";
import { useCancelAppointment } from "@/api/appointments";
import type { AppointmentCardData } from "./AppointmentCard";

interface CancelAppointmentModalProps {
  appointment: AppointmentCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelAppointmentModal({ appointment, open, onOpenChange }: CancelAppointmentModalProps) {
  const cancelAppointment = useCancelAppointment();
  const startDate = new Date(appointment.startAt);

  const handleOpenChange = (next: boolean) => {
    if (!next) cancelAppointment.reset();
    onOpenChange(next);
  };

  const handleConfirm = () => {
    cancelAppointment.mutate(appointment.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="¿Cancelar la cita?"
      subtitle={
        <>
          {appointment.appointmentTypeName} con {appointment.professionalName} el{" "}
          <strong>
            {startDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </strong>{" "}
          a las{" "}
          <strong>{startDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</strong>
        </>
      }
    >
      {cancelAppointment.isError && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {cancelAppointment.error.message}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={cancelAppointment.isPending}>
          Volver
        </Button>
        <Button onClick={handleConfirm} disabled={cancelAppointment.isPending}>
          {cancelAppointment.isPending ? "Cancelando..." : "Cancelar cita"}
        </Button>
      </div>
    </Modal>
  );
}
