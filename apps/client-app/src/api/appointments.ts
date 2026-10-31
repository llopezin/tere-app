import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";

/** Spanish messages for backend booking-window errors (POST /appointments → 400). */
const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  "Cannot book an appointment in the past": "Esta cita ya ha pasado. Elige otro horario.",
  "Appointment is outside the booking window":
    "Esta fecha está fuera del periodo de reserva. Elige otro horario.",
};

interface CreateAppointmentInput {
  patientId: string;
  appointmentTypeId: string;
  startAt: string;
}

async function postCreateAppointment(input: CreateAppointmentInput) {
  const res = await client.appointments.$post({ json: input });
  const data = await res.json();
  if (!res.ok) {
    const message = "message" in data ? (data as { message: string }).message : undefined;
    throw new Error(
      (message && BOOKING_ERROR_MESSAGES[message]) ?? message ?? "Error al crear la cita",
    );
  }
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
