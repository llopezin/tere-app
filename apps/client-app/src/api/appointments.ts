import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";
import { patientAppointmentsQueryOptions } from "@/api/patient-appointments";
import { availabilityQueryKey } from "@/api/availability";

interface CreateAppointmentInput {
  appointmentTypeId: string;
  startAt: string;
}

async function postCreateAppointment(input: CreateAppointmentInput) {
  const res = await client.appointments.$post({ json: input });
  const data = await res.json();
  if (!res.ok) {
    const message =
      "message" in data ? (data as { message: string }).message : "Error al crear la cita";
    throw new Error(message);
  }
  return data;
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCreateAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientAppointmentsQueryOptions().queryKey });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKey });
    },
  });
}

async function patchCancelAppointment(id: string) {
  const res = await client.appointments[":id"].cancel.$patch({ param: { id } });
  if (!res.ok) throw new ApiError(res.status, "No se ha podido cancelar la cita");
  return res.json();
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchCancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientAppointmentsQueryOptions().queryKey });
      queryClient.invalidateQueries({ queryKey: availabilityQueryKey });
    },
  });
}
