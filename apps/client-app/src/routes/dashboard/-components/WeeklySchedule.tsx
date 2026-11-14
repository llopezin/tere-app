import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@fisio-app/ui/lib/cn";
import { WeekNavigator } from "@fisio-app/ui/WeekNavigator";
import { DayHeader } from "@fisio-app/ui/DayHeader";
import {
  DAY_LABELS,
  addDays,
  formatWeekRange,
  getWeekStart,
  toISODate,
} from "@fisio-app/ui/lib/week";
import { availabilityQueryOptions } from "@/api/availability";

/** Max weeks to auto-skip forward looking for the first week with future slots. */
const MAX_AUTO_SKIP_WEEKS = 12;

interface WeeklyScheduleProps {
  professionalId: string;
  appointmentTypeId: string;
  onSlotSelect: (slot: { startAt: string; endAt: string }) => void;
}

export function WeeklySchedule({
  professionalId,
  appointmentTypeId,
  onSlotSelect,
}: WeeklyScheduleProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [userNavigated, setUserNavigated] = useState(false);

  const { monday, friday, weekDays } = useMemo(() => {
    const mon = addDays(getWeekStart(new Date()), weekOffset * 7);
    const days = Array.from({ length: 5 }, (_, i) => addDays(mon, i));
    return { monday: days[0], friday: days[4], weekDays: days };
  }, [weekOffset]);

  const from = toISODate(monday);
  const to = toISODate(friday);

  const { data, isLoading, isError } = useQuery(
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

  const hasFutureSlots = useMemo(() => {
    const now = new Date();
    for (const slots of slotsByDay.values()) {
      if (slots.some((s) => new Date(s.start_at) >= now)) return true;
    }
    return false;
  }, [slotsByDay]);

  // Keep the content area from collapsing while a new week loads (or when a week has no slots):
  // a shorter document would make the browser clamp the scroll position back to the top.
  const contentRef = useRef<HTMLDivElement>(null);
  const reservedHeightRef = useRef(0);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (!isLoading) {
      el.style.minHeight = "";
      reservedHeightRef.current = Math.max(
        reservedHeightRef.current,
        el.getBoundingClientRect().height,
      );
    }
    el.style.minHeight = `${reservedHeightRef.current}px`;
  }, [isLoading, isError, data]);

  useEffect(() => {
    if (
      !isLoading &&
      !isError &&
      !userNavigated &&
      !hasFutureSlots &&
      weekOffset < MAX_AUTO_SKIP_WEEKS
    ) {
      setWeekOffset((o) => o + 1);
    }
  }, [isLoading, isError, userNavigated, hasFutureSlots, weekOffset]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-text">Citas</h3>

      <WeekNavigator
        label={formatWeekRange(monday, friday)}
        previousDisabled={weekOffset === 0}
        onPrevious={() => {
          setUserNavigated(true);
          setWeekOffset((o) => o - 1);
        }}
        onNext={() => {
          setUserNavigated(true);
          setWeekOffset((o) => o + 1);
        }}
      />

      {/* Content */}
      <div ref={contentRef} className={cn(isLoading && "flex items-center justify-center")}>
        {isLoading ? (
          <Loader2 className="size-6 animate-spin text-text-muted" />
        ) : isError ? (
          <div role="alert" className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="size-6 text-danger" />
            <p className="text-sm text-text-muted">
              No se pudo cargar la disponibilidad. Inténtalo de nuevo más tarde.
            </p>
          </div>
        ) : !hasFutureSlots ? (
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
                  <DayHeader day={day} label={DAY_LABELS[i]} />

                  {/* Slots */}
                  <div className="flex w-full flex-col gap-1.5">
                    {slots.length > 0 ? (
                      slots.map((slot) => {
                        const isPast = new Date(slot.start_at) < new Date();
                        return (
                          <button
                            key={slot.start_at}
                            type="button"
                            disabled={isPast}
                            onClick={() =>
                              onSlotSelect({
                                startAt: slot.start_at,
                                endAt: slot.end_at,
                              })
                            }
                            className={cn(
                              "flex justify-center w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                              isPast
                                ? "cursor-not-allowed border-border bg-surface/50 text-text-muted opacity-40"
                                : "border-border bg-surface text-text hover:border-primary-600/40 hover:bg-background",
                            )}
                          >
                            {new Date(slot.start_at).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </button>
                        );
                      })
                    ) : (
                      <span className="py-2 text-xs text-text-muted text-center">Sin citas</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
