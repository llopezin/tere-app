import { CalendarDays, Check, ExternalLink, Mail, Phone } from "lucide-react";
import { Avatar } from "@fisio-app/ui/Avatar";
import { Badge } from "@fisio-app/ui/Badge";
import { Button } from "@fisio-app/ui/Button";
import { Card } from "@fisio-app/ui/Card";
import { SHORT_MONTHS } from "@fisio-app/ui/lib/week";
import type { PatientListItem } from "@/api/patients-list";
import { CONTACT_METHODS } from "../../-components/contact-method";

function formatNextAppointment(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${date.getDate()} de ${SHORT_MONTHS[date.getMonth()]} a las ${time}`;
}

export function PatientCard({ patient }: { patient: PatientListItem }) {
  const contact = patient.contactMethod && CONTACT_METHODS[patient.contactMethod];

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar
        initials={`${patient.firstName[0]}${patient.lastName[0]}`}
        className="size-14 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-text">
            {patient.firstName} {patient.lastName}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
            {patient.email && (
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{patient.email}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              {patient.phone}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
          {contact && (
            <span className="flex items-center gap-1.5">
              <contact.icon className="size-4" />
              {contact.label}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {patient.appointmentsCount === 1
              ? "1 consulta"
              : `${patient.appointmentsCount} consultas`}
          </span>
          {patient.rgpdSigned && (
            <Badge variant="success" className="gap-1">
              <Check className="size-3" />
              RGPD
            </Badge>
          )}
          {patient.activeBonosCount > 0 && (
            <Badge variant="info">
              {patient.activeBonosCount === 1 ? "1 bono" : `${patient.activeBonosCount} bonos`}
            </Badge>
          )}
        </div>

        {patient.nextAppointmentAt && (
          <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-text-secondary">
            Próxima cita:{" "}
            <span className="font-semibold text-text">
              {formatNextAppointment(patient.nextAppointmentAt)}
            </span>
          </p>
        )}
      </div>

      {/* The patient profile arrives in a later iteration. */}
      <Button variant="outline" disabled className="shrink-0 gap-2 self-start">
        Ver Perfil
        <ExternalLink className="size-4" />
      </Button>
    </Card>
  );
}
