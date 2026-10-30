import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarClock, History } from "lucide-react";
import { Card } from "@fisio-app/ui";
import { professionalsQueryOptions } from "@/api/professionals";
import { patientAppointmentsQueryOptions } from "@/api/patient-appointments";
import { AppointmentCard } from "./AppointmentCard";
import type { AppointmentCardData } from "./AppointmentCard";

type SubTab = "upcoming" | "history";

function differenceInMinutes(start: string, end: string) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60_000,
  );
}

export function AppointmentList() {
  const [subTab, setSubTab] = useState<SubTab>("upcoming");

  const { data: professionalsData } = useSuspenseQuery(
    professionalsQueryOptions(),
  );

  const { data: appointmentsData, isLoading } = useQuery(
    patientAppointmentsQueryOptions(),
  );

  // Build lookup maps for resolving IDs → names
  const professionalMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of professionalsData.data) {
      map.set(p.id, p.name);
    }
    return map;
  }, [professionalsData]);

  const typeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of professionalsData.data) {
      for (const t of p.appointmentTypes) {
        map.set(t.id, t.name);
      }
    }
    return map;
  }, [professionalsData]);

  const now = new Date();

  const cards: AppointmentCardData[] = useMemo(() => {
    if (!appointmentsData) return [];
    return appointmentsData.data.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      price: a.price,
      notes: a.notes,
      professionalName: professionalMap.get(a.professionalId) ?? "Profesional",
      appointmentTypeName: typeMap.get(a.appointmentTypeId) ?? "Consulta",
      durationMinutes: differenceInMinutes(a.startAt, a.endAt),
    }));
  }, [appointmentsData, professionalMap, typeMap]);

  const upcoming = cards.filter(
    (c) => c.status === "scheduled" && new Date(c.startAt) >= now,
  );
  const history = cards.filter(
    (c) =>
      c.status !== "scheduled" || new Date(c.startAt) < now,
  );

  const activeList = subTab === "upcoming" ? upcoming : history;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text">Mis Citas</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Consulta tu historial y descarga tus facturas
      </p>

      {/* Sub-tabs */}
      <div className="mt-4 flex gap-1 rounded-lg bg-background p-1">
        <button
          onClick={() => setSubTab("upcoming")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            subTab === "upcoming"
              ? "bg-surface text-primary-600 shadow-sm"
              : "text-text-secondary hover:text-text"
          }`}
        >
          <CalendarClock className="size-4" />
          Próximas Citas
          {!isLoading && (
            <span className="ml-1 text-xs">({upcoming.length})</span>
          )}
        </button>
        <button
          onClick={() => setSubTab("history")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            subTab === "history"
              ? "bg-surface text-primary-600 shadow-sm"
              : "text-text-secondary hover:text-text"
          }`}
        >
          <History className="size-4" />
          Historial
          {!isLoading && (
            <span className="ml-1 text-xs">({history.length})</span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="mt-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-text-secondary">
            Cargando citas...
          </div>
        ) : activeList.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-secondary">
            {subTab === "upcoming"
              ? "No tienes citas programadas"
              : "No hay citas en tu historial"}
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
