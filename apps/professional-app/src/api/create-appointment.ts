import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";
import { calendarAppointmentsQueryKey } from "./calendar-appointments";
import { patientsListQueryKey } from "./patients-list";
import { patientOptionsQueryKey } from "./patient-options";
import { patientBonosQueryKey } from "./patient-bonos";

const createAppointmentEndpoint = client["calendar-appointments"].$post;

export type CreateAppointmentInput = InferRequestType<typeof createAppointmentEndpoint>["json"];

async function postAppointment(json: CreateAppointmentInput) {
  const res = await createAppointmentEndpoint({ json });
  if (!res.ok) throw new ApiError(res.status, "Failed to create appointment");
  return res.json();
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postAppointment,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarAppointmentsQueryKey }),
        // A new appointment changes the patients' order, counters and bono sessions.
        queryClient.invalidateQueries({ queryKey: patientsListQueryKey }),
        queryClient.invalidateQueries({ queryKey: patientOptionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: patientBonosQueryKey }),
      ]),
  });
}
