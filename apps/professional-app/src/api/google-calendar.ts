import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

const googleCalendar = client.integrations["google-calendar"];

async function fetchGoogleCalendarStatus() {
  const res = await googleCalendar.status.$get();
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch status");
  return res.json();
}

export function googleCalendarStatusQueryOptions() {
  return queryOptions({
    queryKey: ["gcal-status"],
    queryFn: fetchGoogleCalendarStatus,
  });
}

/** Starts the OAuth flow: the backend returns Google's consent URL and we navigate to it. */
async function postConnectGoogleCalendar() {
  const res = await googleCalendar.connect.$post();
  if (!res.ok) throw new ApiError(res.status, "Failed to connect");
  const { authUrl } = await res.json();
  window.location.href = authUrl;
}

export function useConnectGoogleCalendar() {
  return useMutation({ mutationFn: postConnectGoogleCalendar });
}

async function postDisconnectGoogleCalendar() {
  const res = await googleCalendar.disconnect.$post();
  if (!res.ok) throw new ApiError(res.status, "Failed to disconnect");
  return res.json();
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postDisconnectGoogleCalendar,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: googleCalendarStatusQueryOptions().queryKey }),
  });
}
