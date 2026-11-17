import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, History } from "lucide-react";
import { Card } from "@fisio-app/ui";
import { SegmentedTabs } from "@fisio-app/ui/SegmentedTabs";
import { patientAppointmentsQueryOptions } from "@/api/patient-appointments";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentListSkeleton } from "./AppointmentListSkeleton";
import type { AppointmentCardData } from "./AppointmentCard";

type SubTab = "upcoming" | "history";

function differenceInMinutes(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

export function AppointmentList() {
  const [subTab, setSubTab] = useState<SubTab>("upcoming");

  const { data: appointmentsData, isLoading } = useQuery(patientAppointmentsQueryOptions());

  const now = new Date();

  const cards: AppointmentCardData[] = useMemo(() => {
    if (!appointmentsData) return [];
    return appointmentsData.data.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      price: a.price,
      professionalName: a.professionalName,
      appointmentTypeName: a.appointmentTypeName,
      durationMinutes: differenceInMinutes(a.startAt, a.endAt),
    }));
  }, [appointmentsData]);

  const upcoming = cards.filter((c) => c.status === "scheduled" && new Date(c.startAt) >= now);
  const history = cards.filter((c) => c.status !== "scheduled" || new Date(c.startAt) < now);

  const activeList = subTab === "upcoming" ? upcoming : history;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text">Mis Citas</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Consulta tu historial y descarga tus facturas
      </p>

      <SegmentedTabs
        className="mt-4"
        label="Mis citas"
        value={subTab}
        onValueChange={setSubTab}
        tabs={[
          {
            value: "upcoming",
            icon: <CalendarClock className="size-4" />,
            label: (
              <>
                Próximas Citas
                {!isLoading && <span className="ml-1 text-xs">({upcoming.length})</span>}
              </>
            ),
          },
          {
            value: "history",
            icon: <History className="size-4" />,
            label: (
              <>
                Historial
                {!isLoading && <span className="ml-1 text-xs">({history.length})</span>}
              </>
            ),
          },
        ]}
      />

      {/* List */}
      <div className="mt-4 flex flex-col gap-3">
        {isLoading ? (
          <AppointmentListSkeleton />
        ) : activeList.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-secondary">
            {subTab === "upcoming" ? "No tienes citas programadas" : "No hay citas en tu historial"}
          </div>
        ) : (
          activeList.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))
        )}
      </div>
    </Card>
  );
}
