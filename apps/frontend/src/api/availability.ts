import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";

export function availabilityQueryOptions(
  professionalId: string,
  appointmentTypeId: string,
  from: string,
  to: string,
) {
  return queryOptions({
    queryKey: ["availability", professionalId, appointmentTypeId, from, to],
    queryFn: async () => {
      const res = await client.availability.$get({
        query: {
          professional_id: professionalId,
          appointment_type_id: appointmentTypeId,
          from,
          to,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
  });
}
