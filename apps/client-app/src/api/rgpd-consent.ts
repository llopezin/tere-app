import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

const postRgpdConsent = async () => {
  const res = await client.patient.me["rgpd-consent"].$get();
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch RGPD consent status");
  return res.json();
};

export function rgpdConsentQueryOptions() {
  return queryOptions({
    queryKey: ["rgpd-consent"],
    queryFn: postRgpdConsent,
  });
}
