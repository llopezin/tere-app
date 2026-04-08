import { db } from '../db/index.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { appointments } from '../db/schema/appointments.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { eq, and, sql, ne } from 'drizzle-orm';

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
    const jsDay = currentDate.getDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

    const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);

    for (const schedule of daySchedules) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);

      const blockStart = new Date(currentDate);
      blockStart.setHours(startH, startM, 0, 0);

      const blockEnd = new Date(currentDate);
      blockEnd.setHours(endH, endM, 0, 0);

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
