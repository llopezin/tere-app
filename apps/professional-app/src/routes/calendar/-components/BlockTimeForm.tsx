import { useState, type FormEvent } from "react";
import { Button } from "@fisio-app/ui/Button";
import { Checkbox } from "@fisio-app/ui/Checkbox";
import { Input } from "@fisio-app/ui/Input";
import { addDays, formatTime, fromISODate, toISODate } from "@fisio-app/ui/lib/week";
import { useCreateBlockedTime } from "@/api/blocked-times";
import { ApiError } from "@/lib/api-error";
import { SLOT_MINUTES } from "./calendar-layout";

const HOUR_MS = 60 * 60_000;
const SLOT_SECONDS = SLOT_MINUTES * 60;

/** Local date `YYYY-MM-DD` at local time `HH:mm`. */
function atTime(date: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const day = fromISODate(date);
  day.setHours(hours, minutes);
  return day;
}

/** The range to block. "Todo el día" goes from 00:00 of the first day to 00:00 after the last. */
function toRange(form: BlockForm) {
  if (form.allDay) {
    return { startAt: fromISODate(form.startDate), endAt: addDays(fromISODate(form.endDate), 1) };
  }
  return {
    startAt: atTime(form.startDate, form.startTime),
    endAt: atTime(form.endDate, form.endTime),
  };
}

interface BlockForm {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
}

function initialForm(startAt: Date): BlockForm {
  const endAt = new Date(startAt.getTime() + HOUR_MS);
  return {
    startDate: toISODate(startAt),
    startTime: formatTime(startAt),
    endDate: toISODate(endAt),
    endTime: formatTime(endAt),
    allDay: false,
  };
}

interface BlockTimeFormProps {
  startAt: Date;
  onDone: () => void;
}

export function BlockTimeForm({ startAt, onDone }: BlockTimeFormProps) {
  const [form, setForm] = useState(() => initialForm(startAt));
  const block = useCreateBlockedTime();
  const update = (changes: Partial<BlockForm>) => setForm((prev) => ({ ...prev, ...changes }));

  const isComplete =
    form.startDate && form.endDate && (form.allDay || (form.startTime && form.endTime));
  const range = isComplete ? toRange(form) : undefined;
  const isValid = range !== undefined && range.endAt > range.startAt;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!range || !isValid) return;
    block.mutate(
      { startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-text">Desde</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <Input
            label="Fecha de inicio"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
          />
          {!form.allDay && (
            <Input
              label="Hora de inicio"
              type="time"
              step={SLOT_SECONDS}
              required
              value={form.startTime}
              onChange={(e) => update({ startTime: e.target.value })}
            />
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-text">Hasta</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <Input
            label="Fecha de fin"
            type="date"
            required
            min={form.startDate}
            value={form.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
          />
          {!form.allDay && (
            <Input
              label="Hora de fin"
              type="time"
              step={SLOT_SECONDS}
              required
              value={form.endTime}
              onChange={(e) => update({ endTime: e.target.value })}
            />
          )}
        </div>
      </fieldset>

      <Checkbox checked={form.allDay} onCheckedChange={(allDay) => update({ allDay })}>
        Todo el día
      </Checkbox>

      {range && !isValid && (
        <p role="alert" className="text-sm text-danger">
          El fin debe ser posterior al inicio.
        </p>
      )}
      {block.isError && (
        <p role="alert" className="text-sm text-danger">
          {block.error instanceof ApiError && block.error.status === 409
            ? "Hay citas en ese horario. Elige otro horario."
            : "No se pudo bloquear el horario. Inténtalo de nuevo."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!isValid || block.isPending}>
          Bloquear horario
        </Button>
      </div>
    </form>
  );
}
