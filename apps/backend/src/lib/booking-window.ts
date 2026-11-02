import { AppError } from '../middleware/error-handler.js';

/**
 * Patients can only book appointments from now until the end of the day
 * `BOOKING_WINDOW_MONTHS` calendar months ahead, in the clinic's time zone.
 * Professionals are not limited.
 *
 * This is the single source of truth: the frontend reads the computed limit
 * from `GET /availability` (`booking_window_last_day`).
 */
export const BOOKING_WINDOW_MONTHS = 3;
export const CLINIC_TIME_ZONE = 'Europe/Madrid';

/**
 * Whether the booking window applies to this user. Fails closed: only professionals
 * are exempt, so an unexpected role is limited like a patient.
 */
export function isBookingLimited(user: { role?: string | null }): boolean {
  return user.role !== 'professional';
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Cached formatter per time zone (creating Intl.DateTimeFormat is relatively expensive). */
function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock date parts of `date` in `timeZone`. */
function getZonedParts(date: Date, timeZone: string) {
  const parts = getFormatter(timeZone).formatToParts(date);
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

/** Calendar date of `date` in clinic time, as `YYYY-MM-DD` (same format as the availability query). */
export function toClinicDate(date: Date): string {
  const { year, month, day } = getZonedParts(date, CLINIC_TIME_ZONE);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Today's date in clinic time, as `YYYY-MM-DD`. */
export function getClinicToday(now: Date = new Date()): string {
  return toClinicDate(now);
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
    throw new AppError(400, 'Cannot book an appointment in the past', 'BOOKING_IN_PAST');
  }
  if (startAt.getTime() > getBookingWindowEnd(now).getTime()) {
    throw new AppError(400, 'Appointment is outside the booking window', 'BOOKING_OUTSIDE_WINDOW');
  }
}
