import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiErrorCode } from "@fisio-app/backend";
import { client } from "@/lib/client";

/** Spanish UI messages for the backend error codes of POST /appointments. */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  BOOKING_IN_PAST: "Esta cita ya ha pasado. Elige otro horario.",
  BOOKING_OUTSIDE_WINDOW: "Esta fecha está fuera del periodo de reserva. Elige otro horario.",
  RGPD_CONSENT_REQUIRED:
    "Debes aceptar el consentimiento de protección de datos antes de reservar.",
  SLOT_UNAVAILABLE: "Este horario ya no está disponible. Elige otro.",
};

function getErrorMessage(body: unknown): string {
  const { code, message } = (body ?? {}) as { code?: string; message?: string };
  if (code && Object.hasOwn(ERROR_MESSAGES, code)) return ERROR_MESSAGES[code as ApiErrorCode];
  return message || "Error al crear la cita";
}

interface CreateAppointmentInput {
  appointmentTypeId: string;
  startAt: string;
}

async function postCreateAppointment(input: CreateAppointmentInput) {
  const res = await client.appointments.$post({ json: input });
  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(data));
  return data;
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCreateAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}
