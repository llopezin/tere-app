import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

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
      if (!res.ok) throw new ApiError(res.status, "Failed to fetch availability");
      return res.json();
    },
  });
}
