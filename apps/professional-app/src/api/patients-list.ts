import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

interface PatientsListParams {
  page: number;
  q: string | undefined;
}

async function fetchPatientsList({ page, q }: PatientsListParams) {
  const res = await client["patients-list"].$get({ query: { page, search: q } });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch patients");
  return res.json();
}

export type PatientListItem = Awaited<ReturnType<typeof fetchPatientsList>>["data"][number];

/** Prefix of every page and search, to invalidate all of them at once. */
export const patientsListQueryKey = ["patients-list"] as const;

export function patientsListQueryOptions(params: PatientsListParams) {
  return queryOptions({
    queryKey: [...patientsListQueryKey, params],
    queryFn: () => fetchPatientsList(params),
    staleTime: 3 * 60_000,
    placeholderData: keepPreviousData,
  });
}
