import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

interface WeekRange {
  from: string;
  to: string;
}

async function fetchCalendarAppointments({ from, to }: WeekRange) {
  const res = await client["calendar-appointments"].$get({ query: { from, to } });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch calendar appointments");
  return res.json();
}

export type CalendarAppointment = Awaited<
  ReturnType<typeof fetchCalendarAppointments>
>["data"][number];

/** Prefix of every week's query, to invalidate all of them at once. */
export const calendarAppointmentsQueryKey = ["calendar-appointments"] as const;

export function calendarAppointmentsQueryOptions(range: WeekRange) {
  return queryOptions({
    queryKey: [...calendarAppointmentsQueryKey, range],
    queryFn: () => fetchCalendarAppointments(range),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}
