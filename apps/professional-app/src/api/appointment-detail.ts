import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";
import { calendarAppointmentsQueryKey } from "./calendar-appointments";
import { patientsListQueryKey } from "./patients-list";

async function fetchAppointmentDetail(id: string) {
  const res = await client.appointments[":id"].$get({ param: { id } });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch appointment");
  return res.json();
}

export function appointmentDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["appointment-detail", id],
    queryFn: () => fetchAppointmentDetail(id),
  });
}

async function patchCancelAppointment(id: string) {
  const res = await client.appointments[":id"].cancel.$patch({ param: { id } });
  if (!res.ok) throw new ApiError(res.status, "Failed to cancel appointment");
  return res.json();
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchCancelAppointment,
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarAppointmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: appointmentDetailQueryOptions(id).queryKey }),
        // The cancelled appointment changes the patient's count and next appointment.
        queryClient.invalidateQueries({ queryKey: patientsListQueryKey }),
      ]),
  });
}
