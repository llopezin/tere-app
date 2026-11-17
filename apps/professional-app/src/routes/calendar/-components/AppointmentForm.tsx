import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Button } from "@fisio-app/ui/Button";
import { Checkbox } from "@fisio-app/ui/Checkbox";
import { Select } from "@fisio-app/ui/Select";
import { Textarea } from "@fisio-app/ui/Textarea";
import { appointmentTypesQueryOptions } from "@/api/appointment-types";
import { patientActiveBonosQueryOptions } from "@/api/patient-bonos";
import { useCreateAppointment } from "@/api/create-appointment";
import { ApiError } from "@/lib/api-error";
import { PatientPicker, type PickedPatient } from "./PatientPicker";

const slotFormat = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });

function errorMessage(error: Error) {
  if (error instanceof ApiError && error.status === 409) {
    return "Ese horario se solapa con otra cita o un bloqueo.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "El paciente debe firmar el consentimiento RGPD antes de reservar.";
  }
  return "No se pudo crear la cita. Inténtalo de nuevo.";
}

interface AppointmentFormProps {
  startAt: Date;
  onDone: () => void;
}

export function AppointmentForm({ startAt, onDone }: AppointmentFormProps) {
  const [patient, setPatient] = useState<PickedPatient>();
  const [typeId, setTypeId] = useState<string>();
  const [deductFromBono, setDeductFromBono] = useState(true);
  const [notes, setNotes] = useState("");

  const types = useQuery(appointmentTypesQueryOptions());
  const bonos = useQuery({
    ...patientActiveBonosQueryOptions(patient?.id ?? ""),
    enabled: patient !== undefined,
  });
  const create = useCreateAppointment();

  const activeTypes = (types.data?.data ?? []).filter((t) => t.isActive);
  // The server deducts from the oldest bono of the type with sessions left
  const hasBonoForType = (bonos.data?.data ?? []).some(
    (b) => b.appointmentTypeId === typeId && b.sessionsUsed < b.totalSessions,
  );

  const choosePatient = (picked: PickedPatient) => {
    setPatient(picked);
    setDeductFromBono(true);
  };
  const chooseType = (id: string) => {
    setTypeId(id);
    setDeductFromBono(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!patient || !typeId) return;
    create.mutate(
      {
        patientId: patient.id,
        appointmentTypeId: typeId,
        startAt: startAt.toISOString(),
        notes: notes.trim() || undefined,
        deductFromBono: hasBonoForType ? deductFromBono : undefined,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-text">
        <CalendarDays className="size-4 shrink-0 text-primary-600" />
        <span className="first-letter:uppercase">
          {slotFormat.format(startAt)} a las {timeFormat.format(startAt)}
        </span>
      </p>

      <PatientPicker value={patient} onChange={choosePatient} />

      {types.isSuccess && activeTypes.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No tienes tipos de consulta activos. Crea uno para poder dar citas.
        </p>
      ) : (
        <Select
          label="Tipo de Consulta *"
          placeholder="Selecciona tipo"
          value={typeId}
          onValueChange={chooseType}
          options={activeTypes.map((t) => ({
            value: t.id,
            label: `${t.name} · ${t.durationMinutes} min`,
          }))}
        />
      )}

      {hasBonoForType && (
        <Checkbox checked={deductFromBono} onCheckedChange={setDeductFromBono}>
          Descontar del bono disponible
        </Checkbox>
      )}

      <Textarea
        label="Notas (opcional)"
        placeholder="Añade comentarios sobre la cita…"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {create.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(create.error)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!patient || !typeId || create.isPending}>
          Crear Cita
        </Button>
      </div>
    </form>
  );
}
