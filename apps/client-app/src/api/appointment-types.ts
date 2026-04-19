import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";

async function fetchAppointmentTypes(professionalId: string) {
  const res = await client["appointment-types"].$get({
    query: { professional_id: professionalId },
  });

  if (!res.ok) throw new Error("Failed to fetch appointment types");
  return await res.json();
}

export function appointmentTypesQueryOptions(professionalId: string) {
  return queryOptions({
    queryKey: ["appointment-types", professionalId],
    queryFn: () => fetchAppointmentTypes(professionalId),
  });
}
