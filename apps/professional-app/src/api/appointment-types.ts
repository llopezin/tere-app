import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchAppointmentTypes() {
  const res = await client["appointment-types"].$get();
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch appointment types");
  return res.json();
}

export function appointmentTypesQueryOptions() {
  return queryOptions({
    queryKey: ["appointment-types"],
    queryFn: fetchAppointmentTypes,
    staleTime: 3 * 60_000,
  });
}
