import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchAppointmentTypes(professionalId: string) {
  const res = await client.professionals[":professionalId"]["appointment-types"].$get({
    param: { professionalId },
  });

  if (!res.ok) throw new ApiError(res.status, "Failed to fetch appointment types");
  return await res.json();
}

export function appointmentTypesQueryOptions(professionalId: string) {
  return queryOptions({
    queryKey: ["appointment-types", professionalId],
    queryFn: () => fetchAppointmentTypes(professionalId),
  });
}
