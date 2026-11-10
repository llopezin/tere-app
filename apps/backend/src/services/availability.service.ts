import { db } from '../db/index.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { appointments } from '../db/schema/appointments.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { eq, and, sql, ne } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler.js';

/** Day of week as stored in working_schedules: Monday = 0 … Sunday = 6 */
const scheduleDayOf = (date: Date) => (date.getDay() + 6) % 7;

/** Minutes since midnight of a Postgres `time` value (`HH:MM:SS`) */
function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Patients can only book inside the professional's working schedule. Read in server local time,
 * like generateAvailableSlots, so every offered slot is bookable.
 * @throws {AppError} 409 if the slot does not fit in any schedule of that day
 */
export async function checkWithinWorkingSchedule(professionalId: string, startAt: Date, endAt: Date): Promise<void> {
  const startMinute = startAt.getHours() * 60 + startAt.getMinutes();
  // From the duration, so a slot crossing midnight ends past 24:00 and fits no schedule
  const endMinute = startMinute + (endAt.getTime() - startAt.getTime()) / 60_000;

  const schedules = await db.select().from(workingSchedules)
    .where(and(
      eq(workingSchedules.professionalId, professionalId),
      eq(workingSchedules.dayOfWeek, scheduleDayOf(startAt)),
    ));
  const fits = schedules.some((schedule) =>
    minutesOfDay(schedule.startTime) <= startMinute && endMinute <= minutesOfDay(schedule.endTime));
  if (!fits) throw new AppError(409, 'Time slot is outside the working schedule');
}

export async function generateAvailableSlots(
  professionalId: string,
  appointmentTypeId: string,
  from: Date,
  to: Date
): Promise<Array<{ start_at: string; end_at: string }>> {
  // Get appointment type to know duration
  const [apptType] = await db.select().from(appointmentTypes)
    .where(eq(appointmentTypes.id, appointmentTypeId));
  if (!apptType) {
    throw new Error('Appointment type not found');
  }

  const durationMs = apptType.durationMinutes * 60 * 1000;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  // Fetch all relevant data
  const schedules = await db.select().from(workingSchedules)
    .where(eq(workingSchedules.professionalId, professionalId));

  const existingAppts = await db.select().from(appointments)
    .where(and(
      eq(appointments.professionalId, professionalId),
      ne(appointments.status, 'cancelled'),
      sql`${appointments.startAt} >= ${fromDate.toISOString()}`,
      sql`${appointments.endAt} <= ${toDate.toISOString()}`,
    ));

  const blocked = await db.select().from(blockedTimes)
    .where(and(
      eq(blockedTimes.professionalId, professionalId),
      sql`${blockedTimes.endAt} >= ${fromDate.toISOString()}`,
      sql`${blockedTimes.startAt} <= ${toDate.toISOString()}`,
    ));

  // Generate slots
  const slots: { start_at: string; end_at: string }[] = [];
  const currentDate = new Date(fromDate);

  while (currentDate <= toDate) {
    const daySchedules = schedules.filter((s) => s.dayOfWeek === scheduleDayOf(currentDate));

    for (const schedule of daySchedules) {
      const blockStart = new Date(currentDate);
      blockStart.setHours(0, minutesOfDay(schedule.startTime), 0, 0);

      const blockEnd = new Date(currentDate);
      blockEnd.setHours(0, minutesOfDay(schedule.endTime), 0, 0);

      let slotStart = new Date(blockStart);
      while (slotStart.getTime() + durationMs <= blockEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        const overlapsAppt = existingAppts.some((a) => {
          const aStart = new Date(a.startAt).getTime();
          const aEnd = new Date(a.endAt).getTime();
          return slotStart.getTime() < aEnd && slotEnd.getTime() > aStart;
        });

        const overlapsBlocked = blocked.some((b) => {
          const bStart = new Date(b.startAt).getTime();
          const bEnd = new Date(b.endAt).getTime();
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });

        if (!overlapsAppt && !overlapsBlocked) {
          slots.push({
            start_at: slotStart.toISOString(),
            end_at: slotEnd.toISOString(),
          });
        }

        slotStart = new Date(slotStart.getTime() + durationMs);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}
