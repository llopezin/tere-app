import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchPatientAppointments() {
  const res = await client.appointments.$get({
    query: { per_page: 100 },
  });

  if (!res.ok) throw new ApiError(res.status, "Failed to fetch appointments");
  return await res.json();
}

export function patientAppointmentsQueryOptions() {
  return queryOptions({
    queryKey: ["patient-appointments"],
    queryFn: fetchPatientAppointments,
    // "Mis Citas" unmounts when switching tabs: dropping the cache makes every landing fetch fresh
    // and show the skeleton, instead of the old list (e.g. without a just-booked appointment)
    gcTime: 0,
  });
}
