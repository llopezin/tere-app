import { Plus } from "lucide-react";
import { cn } from "@fisio-app/ui/lib/cn";
import { DayHeader } from "@fisio-app/ui/DayHeader";
import { DAY_LABELS, addDays, isSameDay, toISODate } from "@fisio-app/ui/lib/week";
import type { CalendarAppointment } from "@/api/calendar-appointments";
import type { BlockedTime } from "@/api/blocked-times";
import { AppointmentBlock } from "./AppointmentBlock";
import { BlockedTimeBlock } from "./BlockedTimeBlock";
import {
  HOUR_HEIGHT_PX,
  SLOTS_PER_HOUR,
  SLOT_HEIGHT_PX,
  getBlockPosition,
  getSlotStart,
  getVisibleHours,
} from "./calendar-layout";

const slotLabel = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const COLUMNS =
  "grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] md:grid-cols-[4rem_repeat(7,minmax(0,1fr))]";

interface WeekGridProps {
  weekStart: Date;
  appointments: CalendarAppointment[];
  blockedTimes: BlockedTime[];
  onSelectAppointment: (appointment: CalendarAppointment) => void;
  onSelectSlot: (slotStart: Date) => void;
}

export function WeekGrid({
  weekStart,
  appointments,
  blockedTimes,
  onSelectAppointment,
  onSelectSlot,
}: WeekGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  // Only appointments widen the grid: a whole-day block would otherwise stretch it to 24h
  const hours = getVisibleHours(appointments);
  const hourRows = Array.from(
    { length: hours.endHour - hours.startHour },
    (_, i) => hours.startHour + i,
  );
  const slotRows = Array.from({ length: hourRows.length * SLOTS_PER_HOUR }, (_, i) => i);

  return (
    <div>
      <div className={cn(COLUMNS, "mb-4 gap-1 md:gap-2")}>
        <span className="pt-2 text-center text-xs text-text-secondary md:text-sm">Hora</span>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <DayHeader
              key={toISODate(day)}
              day={day}
              label={DAY_LABELS[i]}
              isToday={isToday}
              className={cn(
                "rounded-lg py-2 [&>span:nth-child(2)]:text-base md:[&>span:nth-child(2)]:text-lg",
                isToday ? "bg-primary-100" : "bg-background",
              )}
            />
          );
        })}
      </div>

      <div className={cn(COLUMNS, "gap-x-1 md:gap-x-2")}>
        <div className="relative" style={{ height: hourRows.length * HOUR_HEIGHT_PX }}>
          {hourRows.map((hour, i) => (
            <span
              key={hour}
              style={{ top: i * HOUR_HEIGHT_PX }}
              className="absolute inset-x-0 -translate-y-1/2 text-center text-xs font-medium text-text-secondary md:text-sm"
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((day) => (
          <div key={toISODate(day)} className="relative">
            {slotRows.map((slot) => {
              const slotStart = getSlotStart(day, hours, slot);
              return (
                <button
                  key={slot}
                  type="button"
                  aria-label={`Añadir el ${slotLabel.format(slotStart)}`}
                  onClick={() => onSelectSlot(slotStart)}
                  style={{ height: SLOT_HEIGHT_PX }}
                  className={cn(
                    "group flex w-full cursor-pointer items-center justify-center border-t hover:bg-primary-50/60",
                    "focus-visible:bg-primary-50 focus-visible:outline-none",
                    slot % SLOTS_PER_HOUR === 0 ? "border-border" : "border-border/40",
                  )}
                >
                  <Plus className="size-3 text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                </button>
              );
            })}

            {blockedTimes.map((blocked) => {
              const position = getBlockPosition(blocked.startAt, blocked.endAt, day, hours);
              return position && <BlockedTimeBlock key={blocked.id} position={position} />;
            })}

            {appointments.map((appointment) => {
              const position = getBlockPosition(appointment.startAt, appointment.endAt, day, hours);
              return (
                position && (
                  <AppointmentBlock
                    key={appointment.id}
                    appointment={appointment}
                    position={position}
                    onSelect={onSelectAppointment}
                  />
                )
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
