import { AppError } from '../middleware/error-handler.js';

/**
 * Patients can only book appointments from now until the end of the day
 * `BOOKING_WINDOW_MONTHS` calendar months ahead, in the clinic's time zone.
 * Professionals are not limited.
 *
 * This is the single source of truth: the frontend reads the computed limit
 * from `GET /availability` (`booking_window_end`).
 */
export const BOOKING_WINDOW_MONTHS = 3;
export const CLINIC_TIME_ZONE = 'Europe/Madrid';

/** Wall-clock date parts of `date` in `timeZone`. */
function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** UTC instant of midnight at the start of `year-month-day` in `timeZone`. */
function zonedMidnightToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const asUtc = Date.UTC(year, month - 1, day);
  // Offset of the zone at (approximately) that instant; re-check once to handle DST edges.
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = getZonedParts(new Date(guess), timeZone);
    const zonedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess = asUtc - (zonedAsUtc - guess);
  }
  return new Date(guess);
}

/**
 * Last bookable instant: end of day (23:59:59.999, clinic time) of today + N months.
 * The day is clamped to the target month's length (e.g. 30 Nov → 28/29 Feb).
 */
export function getBookingWindowEnd(now: Date = new Date()): Date {
  const { year, month, day } = getZonedParts(now, CLINIC_TIME_ZONE);
  const targetMonthIndex = month - 1 + BOOKING_WINDOW_MONTHS;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12) + 1;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  // Start of the following day in clinic time, minus 1 ms.
  const nextDay = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay + 1));
  const startOfNextDay = zonedMidnightToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    CLINIC_TIME_ZONE,
  );
  return new Date(startOfNextDay.getTime() - 1);
}

/** Throws a 400 if a patient tries to book in the past or beyond the booking window. */
export function assertPatientCanBookAt(startAt: Date, now: Date = new Date()): void {
  if (startAt.getTime() < now.getTime()) {
    throw new AppError(400, 'Cannot book an appointment in the past');
  }
  if (startAt.getTime() > getBookingWindowEnd(now).getTime()) {
    throw new AppError(400, 'Appointment is outside the booking window');
  }
}
