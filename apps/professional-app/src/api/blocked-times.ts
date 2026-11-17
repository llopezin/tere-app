import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
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

async function postBlockedTime(json: { startAt: string; endAt: string }) {
  const res = await client["blocked-times"].$post({ json });
  if (!res.ok) throw new ApiError(res.status, "Failed to create blocked time");
  return res.json();
}

async function deleteBlockedTime(id: string) {
  const res = await client["blocked-times"][":id"].$delete({ param: { id } });
  if (!res.ok) throw new ApiError(res.status, "Failed to delete blocked time");
  return res.json();
}

export function useDeleteBlockedTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBlockedTime,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blockedTimesQueryKey }),
  });
}

export function useCreateBlockedTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postBlockedTime,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blockedTimesQueryKey }),
  });
}
