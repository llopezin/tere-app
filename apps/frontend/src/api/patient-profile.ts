import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";

export function patientProfileQueryOptions() {
  return queryOptions({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const res = await client.patient.me.$get();
      if (!res.ok) throw new Error("Failed to fetch patient profile");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
