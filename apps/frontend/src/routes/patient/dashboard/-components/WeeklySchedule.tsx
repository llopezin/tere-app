import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { availabilityQueryOptions } from "@/api/availability";

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const SHORT_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const DAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE"] as const;

interface WeeklyScheduleProps {
  professionalId: string;
  appointmentTypeId: string;
  onSlotSelect: (slot: { startAt: string; endAt: string }) => void;
}

function getMonday(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  // getDay(): 0=Sun, 1=Mon … 6=Sat → shift so Monday=0
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday + offset * 7,
  );
  return monday;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatWeekRange(monday: Date, friday: Date): string {
  const mDay = monday.getDate();
  const mMonth = MONTH_NAMES[monday.getMonth()];
  const fDay = friday.getDate();
  const fMonth = MONTH_NAMES[friday.getMonth()];
  const fYear = friday.getFullYear();

  if (monday.getMonth() === friday.getMonth()) {
    return `${mDay} de ${mMonth} - ${fDay} de ${fMonth} ${fYear}`;
  }
  return `${mDay} de ${mMonth} - ${fDay} de ${fMonth} ${fYear}`;
}

export function WeeklySchedule({
  professionalId,
  appointmentTypeId,
  onSlotSelect,
}: WeeklyScheduleProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, friday, weekDays } = useMemo(() => {
    const mon = getMonday(weekOffset);
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      days.push(
        new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i),
      );
    }
    return { monday: days[0], friday: days[4], weekDays: days };
  }, [weekOffset]);

  const from = toISODate(monday);
  const to = toISODate(friday);

  const { data, isLoading } = useQuery(
    availabilityQueryOptions(professionalId, appointmentTypeId, from, to),
  );

  const slotsByDay = useMemo(() => {
    const map = new Map<string, { start_at: string; end_at: string }[]>();
    for (const day of weekDays) {
      map.set(toISODate(day), []);
    }
    if (data?.slots) {
      for (const slot of data.slots) {
        const dateKey = toISODate(new Date(slot.start_at));
        const existing = map.get(dateKey);
        if (existing) {
          existing.push(slot);
        }
      }
    }
    return map;
  }, [data, weekDays]);

  const hasAnySlots = useMemo(() => {
    for (const slots of slotsByDay.values()) {
      if (slots.length > 0) return true;
    }
    return false;
  }, [slotsByDay]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-text">Citas</h3>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset((o) => o - 1)}
          className={cn(
            "size-8 rounded-md text-text-muted transition-colors",
            weekOffset === 0
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-background",
          )}
        >
          <ChevronLeft className="mx-auto size-5" />
        </button>

        <span className="text-sm font-medium text-text">
          {formatWeekRange(monday, friday)}
        </span>

        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="size-8 rounded-md text-text-muted hover:bg-background transition-colors"
        >
          <ChevronRight className="mx-auto size-5" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-text-muted" />
        </div>
      ) : !hasAnySlots ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay citas disponibles esta semana
        </p>
      ) : (
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {weekDays.map((day, i) => {
            const dateKey = toISODate(day);
            const slots = slotsByDay.get(dateKey) ?? [];

            return (
              <div key={dateKey} className="flex flex-col items-center gap-2">
                {/* Day header */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-text-muted">
                    {DAY_LABELS[i]}
                  </span>
                  <span className="text-lg font-bold text-text">
                    {day.getDate()}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {SHORT_MONTHS[day.getMonth()]}
                  </span>
                </div>

                {/* Slots */}
                <div className="flex w-full flex-col items-center gap-1.5">
                  {slots.length > 0 ? (
                    slots.map((slot) => (
                      <button
                        key={slot.start_at}
                        type="button"
                        onClick={() =>
                          onSlotSelect({
                            startAt: slot.start_at,
                            endAt: slot.end_at,
                          })
                        }
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:border-green-300 hover:bg-green-100"
                      >
                        {new Date(slot.start_at).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </button>
                    ))
                  ) : (
                    <span className="py-2 text-xs text-text-muted">
                      Sin citas
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
