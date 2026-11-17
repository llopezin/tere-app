import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchPatientOptions(search: string | undefined) {
  const res = await client["patient-options"].$get({ query: { search } });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch patient options");
  return res.json();
}

export type PatientOption = Awaited<ReturnType<typeof fetchPatientOptions>>["data"][number];

/** Prefix of every search, to invalidate all of them at once. */
export const patientOptionsQueryKey = ["patient-options"] as const;

export function patientOptionsQueryOptions(search: string | undefined) {
  return queryOptions({
    queryKey: [...patientOptionsQueryKey, search],
    queryFn: () => fetchPatientOptions(search),
    staleTime: 3 * 60_000,
    placeholderData: keepPreviousData,
  });
}
