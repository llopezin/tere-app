const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
export const SLOT_MINUTES = 15;
export const SLOT_HEIGHT_PX = 20;
export const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
export const HOUR_HEIGHT_PX = SLOTS_PER_HOUR * SLOT_HEIGHT_PX;

const MS_PER_MINUTE = 60_000;

function atHour(day: Date, hour: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
}

export interface VisibleHours {
  startHour: number;
  endHour: number;
}

/** 08:00–20:00, widened so every appointment of the week is visible. */
export function getVisibleHours(ranges: { startAt: string; endAt: string }[]): VisibleHours {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const { startAt, endAt } of ranges) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    startHour = Math.min(startHour, start.getHours());
    const endsOnSameDay = end.getDate() === start.getDate();
    endHour = Math.max(
      endHour,
      endsOnSameDay ? Math.ceil(end.getHours() + end.getMinutes() / 60) : 24,
    );
  }
  return { startHour, endHour };
}

/**
 * Vertical position of [startAt, endAt) inside `day`'s column, clipped to the visible hours.
 * Returns null when nothing of the range falls in that day.
 */
export function getBlockPosition(startAt: string, endAt: string, day: Date, hours: VisibleHours) {
  const dayStart = atHour(day, hours.startHour);
  const start = Math.max(new Date(startAt).getTime(), dayStart);
  const end = Math.min(new Date(endAt).getTime(), atHour(day, hours.endHour));
  if (end <= start) return null;

  const toPx = (ms: number) => (ms / MS_PER_MINUTE / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  return { top: toPx(start - dayStart), height: toPx(end - start) };
}
