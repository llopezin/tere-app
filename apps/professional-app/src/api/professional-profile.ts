import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

async function fetchProfessionalProfile() {
  const res = await client.me.$get();
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch profile");
  return res.json();
}

/** Only changes when the professional edits it, so it is kept for a day. */
export function professionalProfileQueryOptions() {
  return queryOptions({
    queryKey: ["professional-profile"],
    queryFn: fetchProfessionalProfile,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
}
