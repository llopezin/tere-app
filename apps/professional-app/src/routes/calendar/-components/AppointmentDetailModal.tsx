import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, Calendar, Clock, Euro, SquarePen, User } from "lucide-react";
import { Modal } from "@fisio-app/ui/Modal";
import { Button } from "@fisio-app/ui/Button";
import { Divider } from "@fisio-app/ui/Divider";
import { DetailItem } from "@fisio-app/ui/DetailItem";
import { StatusBadge } from "@fisio-app/ui/StatusBadge";
import { SHORT_MONTHS } from "@fisio-app/ui/lib/week";
import type { CalendarAppointment } from "@/api/calendar-appointments";
import { appointmentDetailQueryOptions, useCancelAppointment } from "@/api/appointment-detail";
import { CONTACT_METHODS } from "../../-components/contact-method";

const priceFormat = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function formatDate(date: Date) {
  return `${date.getDate()} de ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function Skeleton() {
  return <span className="inline-block h-5 w-24 animate-pulse rounded bg-background" />;
}

interface AppointmentDetailModalProps {
  appointment: CalendarAppointment | null;
  onClose: () => void;
}

export function AppointmentDetailModal({ appointment, onClose }: AppointmentDetailModalProps) {
  return (
    <Modal
      open={appointment !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Detalles de la Cita"
      subtitle="Gestiona la información de la consulta"
      headerAside={appointment && <StatusBadge status={appointment.status} />}
      className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto"
    >
      {appointment && (
        <AppointmentDetail key={appointment.id} appointment={appointment} onClose={onClose} />
      )}
    </Modal>
  );
}

function AppointmentDetail({
  appointment,
  onClose,
}: {
  appointment: CalendarAppointment;
  onClose: () => void;
}) {
  const { data: detail, isError } = useQuery(appointmentDetailQueryOptions(appointment.id));
  const cancel = useCancelAppointment();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const startAt = new Date(appointment.startAt);
  const endAt = new Date(appointment.endAt);
  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
  // PRD: an appointment can only be cancelled before it starts.
  const canCancel = appointment.status === "scheduled" && startAt > new Date();
  const contact = detail?.patient.contactMethod && CONTACT_METHODS[detail.patient.contactMethod];

  const handleCancel = () => {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    cancel.mutate(appointment.id, { onSuccess: onClose });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <DetailItem icon={Calendar} label="Fecha y Hora" hint={`${formatTime(startAt)} hrs`}>
            {formatDate(startAt)}
          </DetailItem>
          <DetailItem icon={Clock} label="Duración">
            {durationMinutes} minutos
          </DetailItem>
          <DetailItem icon={Euro} label="Precio">
            {detail ? priceFormat.format(Number(detail.price)) : <Skeleton />}
          </DetailItem>
        </div>
        <div className="h-fit rounded-lg bg-background p-4">
          <p className="text-sm text-text-secondary">Tipo de Consulta</p>
          <p className="mt-2 text-lg font-semibold text-text">{appointment.appointmentTypeName}</p>
        </div>
      </div>

      <Divider />

      <section className="flex flex-col gap-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-text">
          <User className="size-5" />
          Información del Paciente
        </h3>
        {isError ? (
          <p role="alert" className="text-sm text-danger">
            No se pudieron cargar los datos del paciente.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Nombre">{appointment.patientName}</DetailItem>
            <DetailItem label="Email">
              {detail ? (detail.patient.email ?? "—") : <Skeleton />}
            </DetailItem>
            <DetailItem label="Teléfono">{detail ? detail.patient.phone : <Skeleton />}</DetailItem>
            <DetailItem label="Método de Contacto">
              {!detail ? (
                <Skeleton />
              ) : contact ? (
                <span
                  title={contact.label}
                  className="mt-1 inline-flex size-9 items-center justify-center rounded-lg border border-border"
                >
                  <contact.icon className="size-4" aria-label={contact.label} />
                </span>
              ) : (
                "—"
              )}
            </DetailItem>
          </div>
        )}
      </section>

      <Divider />

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Editing arrives in a later iteration. */}
        <Button variant="outline" disabled className="gap-2">
          <SquarePen className="size-4" />
          Editar
        </Button>
        <Button
          variant="danger"
          disabled={!canCancel || cancel.isPending}
          onClick={handleCancel}
          className="gap-2"
        >
          <Ban className="size-4" />
          {confirmingCancel ? "Confirmar cancelación" : "Cancelar Cita"}
        </Button>
      </div>
      {cancel.isError && (
        <p role="alert" className="text-sm text-danger">
          No se pudo cancelar la cita. Inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
