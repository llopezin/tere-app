import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

interface WeekRange {
  from: string;
  to: string;
}

async function fetchBlockedTimes({ from, to }: WeekRange) {
  const res = await client["blocked-times"].$get({ query: { from, to } });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch blocked times");
  return res.json();
}

export type BlockedTime = Awaited<ReturnType<typeof fetchBlockedTimes>>["data"][number];

/** Prefix of every week's query, to invalidate all of them at once. */
export const blockedTimesQueryKey = ["blocked-times"] as const;

export function blockedTimesQueryOptions(range: WeekRange) {
  return queryOptions({
    queryKey: [...blockedTimesQueryKey, range],
    queryFn: () => fetchBlockedTimes(range),
    placeholderData: keepPreviousData,
  });
}
