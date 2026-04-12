import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";

interface CreateAppointmentInput {
  patientId: string;
  appointmentTypeId: string;
  startAt: string;
}

async function postCreateAppointment(input: CreateAppointmentInput) {
  const res = await client.appointments.$post({ json: input });
  const data = await res.json();
  if (!res.ok) {
    const message =
      "message" in data
        ? (data as { message: string }).message
        : "Error al crear la cita";
    throw new Error(message);
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
