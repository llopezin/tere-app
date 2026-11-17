import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchActiveBonos(patientId: string) {
  const res = await client.patients[":id"].bonos.$get({
    param: { id: patientId },
    query: { status: "active" },
  });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch bonos");
  return res.json();
}

/** Prefix of every patient's bonos, to invalidate all of them at once. */
export const patientBonosQueryKey = ["patient-bonos"] as const;

export function patientActiveBonosQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: [...patientBonosQueryKey, patientId],
    queryFn: () => fetchActiveBonos(patientId),
  });
}
