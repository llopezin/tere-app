import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Card } from "@fisio-app/ui/Card";
import { addDays, fromISODate, getWeekStart, toISODate } from "@fisio-app/ui/lib/week";
import { authClient } from "@/lib/auth-client";
import {
  calendarAppointmentsQueryOptions,
  type CalendarAppointment,
} from "@/api/calendar-appointments";
import { blockedTimesQueryOptions } from "@/api/blocked-times";
import { PanelHeader } from "../-components/PanelHeader";
import { PanelTabs } from "../-components/PanelTabs";
import { CalendarToolbar } from "./-components/CalendarToolbar";
import { WeekGrid } from "./-components/WeekGrid";
import { CalendarLegend } from "./-components/CalendarLegend";
import { AppointmentDetailModal } from "./-components/AppointmentDetailModal";

const searchSchema = z.object({
  /** Any date of the week to show, YYYY-MM-DD. Defaults to the current week. */
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
});

function getWeek(week: string | undefined) {
  const start = getWeekStart(week ? fromISODate(week) : new Date());
  return { start, range: { from: start.toISOString(), to: addDays(start, 7).toISOString() } };
}

export const Route = createFileRoute("/calendar/")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.session || session.data.user.role !== "professional") {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({ week: search.week }),
  loader: ({ context: { queryClient }, deps }) => {
    const { range } = getWeek(deps.week);
    void queryClient.prefetchQuery(calendarAppointmentsQueryOptions(range));
    void queryClient.prefetchQuery(blockedTimesQueryOptions(range));
  },
  component: CalendarPage,
});

function CalendarPage() {
  const { week } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { start: weekStart, range } = getWeek(week);
  const appointments = useQuery(calendarAppointmentsQueryOptions(range));
  const blockedTimes = useQuery(blockedTimesQueryOptions(range));
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);

  const goToWeek = (date: Date) => navigate({ search: { week: toISODate(getWeekStart(date)) } });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50/60 via-background to-green-50/40">
      <PanelHeader />
      <PanelTabs />

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <CalendarToolbar weekStart={weekStart} onWeekChange={goToWeek} />

          <Card className="p-3 md:p-6">
            {(appointments.isError || blockedTimes.isError) && (
              <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-danger">
                <AlertCircle className="size-4" />
                No se pudo cargar el calendario. Inténtalo de nuevo más tarde.
              </p>
            )}
            <div
              className={
                appointments.isPlaceholderData ? "opacity-60 transition-opacity" : undefined
              }
            >
              <WeekGrid
                weekStart={weekStart}
                appointments={appointments.data?.data ?? []}
                blockedTimes={blockedTimes.data?.data ?? []}
                onSelectAppointment={setSelected}
              />
            </div>
          </Card>

          <CalendarLegend />
        </div>
      </main>

      <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
