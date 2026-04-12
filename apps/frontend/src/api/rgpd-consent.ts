import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";

export function rgpdConsentQueryOptions() {
  return queryOptions({
    queryKey: ["rgpd-consent"],
    queryFn: async () => {
      const res = await client.patient.me["rgpd-consent"].$get();
      if (!res.ok) throw new Error("Failed to fetch RGPD consent status");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
