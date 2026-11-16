import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

/** Prefix of every availability query, to invalidate all of them at once. */
export const availabilityQueryKey = ["availability"] as const;

export function availabilityQueryOptions(
  professionalId: string,
  appointmentTypeId: string,
  from: string,
  to: string,
) {
  return queryOptions({
    queryKey: [...availabilityQueryKey, professionalId, appointmentTypeId, from, to],
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
