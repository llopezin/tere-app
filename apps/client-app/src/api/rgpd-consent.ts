import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchRgpdConsent() {
  const res = await client.me["rgpd-consent"].$get();
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch RGPD consent status");
  return res.json();
}

export function rgpdConsentQueryOptions() {
  return queryOptions({
    queryKey: ["rgpd-consent"],
    queryFn: fetchRgpdConsent,
  });
}

async function postAcceptRgpdConsent() {
  const res = await client.me["rgpd-consent"].$post();
  if (!res.ok) throw new ApiError(res.status, "Error al registrar el consentimiento RGPD");
  return res.json();
}

export function useAcceptRgpdConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postAcceptRgpdConsent,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: rgpdConsentQueryOptions().queryKey }),
  });
}
