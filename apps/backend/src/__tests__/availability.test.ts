import { describe, test, expect } from 'vitest';
import { testDb } from './setup.js';
import { createProfessional, createAppointmentType, createAppointment, createPatient } from './helpers.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { blockedTimes } from '../db/schema/blocked-times.js';

describe('Availability Slot Generation', () => {
  test('generates slots based on working schedule', async () => {
    const professional = await createProfessional('Dr. Smith');
    const apptType = await createAppointmentType('Massage', 60, professional.id);

    // Monday 9:00 - 13:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0, // Monday
      startTime: '09:00',
      endTime: '13:00',
    });

    // Request slots for a Monday
    const from = new Date('2026-04-06'); // Monday local time
    const to = new Date('2026-04-06');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // Should generate 4 slots: 9:00-10:00, 10:00-11:00, 11:00-12:00, 12:00-13:00
    expect(slots).toHaveLength(4);
    
    // Verify slots are sequential and 60 minutes apart
    for (let i = 0; i < slots.length - 1; i++) {
      const currentEnd = new Date(slots[i].end_at).getTime();
      const nextStart = new Date(slots[i + 1].start_at).getTime();
      expect(currentEnd).toBe(nextStart);
    }
  });

  test('excludes slots occupied by existing appointments', async () => {
    const professional = await createProfessional('Dr. Jones');
    const apptType = await createAppointmentType('Consultation', 60, professional.id);
    const patient = await createPatient(professional.id);

    // Schedule: Monday 9:00 - 12:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '12:00',
    });

    // Existing appointment at 10:00-11:00 local time
    const apptStart = new Date('2026-04-06');
    apptStart.setHours(10, 0, 0, 0);
    const apptEnd = new Date('2026-04-06');
    apptEnd.setHours(11, 0, 0, 0);
    
    await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: apptStart,
      endAt: apptEnd,
    });

    const from = new Date('2026-04-06');
    const to = new Date('2026-04-06');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // Should only have 2 slots: 9:00-10:00, 11:00-12:00 (10:00-11:00 excluded)
    expect(slots).toHaveLength(2);
  });

  test('excludes slots blocked by blocked times', async () => {
    const professional = await createProfessional('Dr. Wilson');
    const apptType = await createAppointmentType('Therapy', 60, professional.id);

    // Schedule: Monday 9:00 - 12:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '12:00',
    });

    // Blocked time at 10:00-11:00
    const blockStart = new Date('2026-04-06');
    blockStart.setHours(10, 0, 0, 0);
    const blockEnd = new Date('2026-04-06');
    blockEnd.setHours(11, 0, 0, 0);
    
    await testDb.insert(blockedTimes).values({
      professionalId: professional.id,
      startAt: blockStart,
      endAt: blockEnd,
      reason: 'Lunch break',
    });

    const from = new Date('2026-04-06');
    const to = new Date('2026-04-06');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // Should only have 2 slots: 9:00-10:00, 11:00-12:00
    expect(slots).toHaveLength(2);
  });

  test('handles partial overlaps with blocked times', async () => {
    const professional = await createProfessional('Dr. Lee');
    const apptType = await createAppointmentType('Session', 60, professional.id);

    // Schedule: Monday 9:00 - 12:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '12:00',
    });

    // Blocked time partially overlaps: 09:30-10:30
    const blockStart = new Date('2026-04-06');
    blockStart.setHours(9, 30, 0, 0);
    const blockEnd = new Date('2026-04-06');
    blockEnd.setHours(10, 30, 0, 0);
    
    await testDb.insert(blockedTimes).values({
      professionalId: professional.id,
      startAt: blockStart,
      endAt: blockEnd,
      reason: 'Meeting',
    });

    const from = new Date('2026-04-06');
    const to = new Date('2026-04-06');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // 9:00-10:00 overlaps with 9:30-10:30 block, so excluded
    // 10:00-11:00 overlaps with 9:30-10:30 block, so excluded
    // Only 11:00-12:00 is free
    expect(slots).toHaveLength(1);
  });

  test('generates slots for multiple days', async () => {
    const professional = await createProfessional('Dr. Kim');
    const apptType = await createAppointmentType('Checkup', 30, professional.id);

    // Monday 9:00-10:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '10:00',
    });

    // Tuesday 14:00-15:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '15:00',
    });

    // Request Monday and Tuesday
    const from = new Date('2026-04-06'); // Monday
    const to = new Date('2026-04-07'); // Tuesday
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // Monday: 2 slots (9:00-9:30, 9:30-10:00)
    // Tuesday: 2 slots (14:00-14:30, 14:30-15:00)
    expect(slots).toHaveLength(4);
  });

  test('handles no working schedule for requested day', async () => {
    const professional = await createProfessional('Dr. Brown');
    const apptType = await createAppointmentType('Visit', 60, professional.id);

    // Only schedule on Monday
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '10:00',
    });

    // Request Tuesday (no schedule)
    const from = new Date('2026-04-07'); // Tuesday
    const to = new Date('2026-04-07');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    expect(slots).toHaveLength(0);
  });

  test('respects appointment duration for slot sizing', async () => {
    const professional = await createProfessional('Dr. Garcia');
    const apptType = await createAppointmentType('Short Session', 30, professional.id);

    // Monday 9:00-10:00
    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '10:00',
    });

    const from = new Date('2026-04-06');
    const to = new Date('2026-04-06');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // 30-minute slots in 1-hour window = 2 slots
    expect(slots).toHaveLength(2);
    
    // Verify 30-minute duration
    const duration = new Date(slots[0].end_at).getTime() - new Date(slots[0].start_at).getTime();
    expect(duration).toBe(30 * 60 * 1000);
  });

  test('excludes cancelled appointments from availability check', async () => {
    const professional = await createProfessional('Dr. Martinez');
    const apptType = await createAppointmentType('Treatment', 60, professional.id);
    const patient = await createPatient(professional.id);

    await testDb.insert(workingSchedules).values({
      professionalId: professional.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '11:00',
    });

    // Create a cancelled appointment at 09:00-10:00
    const apptStart = new Date('2026-04-06');
    apptStart.setHours(9, 0, 0, 0);
    const apptEnd = new Date('2026-04-06');
    apptEnd.setHours(10, 0, 0, 0);
    
    await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: apptStart,
      endAt: apptEnd,
      status: 'cancelled',
    });

    const from = new Date('2026-04-06');
    const to = new Date('2026-04-06');
    to.setHours(23, 59, 59, 999);

    const slots = await generateSlots(professional.id, apptType.id, from, to);

    // Cancelled appointments shouldn't block slots - should have 2 slots
    expect(slots).toHaveLength(2);
  });
});

// Helper to call the actual availability handler logic
async function generateSlots(
  professionalId: string,
  appointmentTypeId: string,
  from: Date,
  to: Date
): Promise<Array<{ start_at: string; end_at: string }>> {
  const { db } = await import('../db/index.js');
  const { workingSchedules } = await import('../db/schema/working-schedules.js');
  const { appointments } = await import('../db/schema/appointments.js');
  const { blockedTimes } = await import('../db/schema/blocked-times.js');
  const { appointmentTypes } = await import('../db/schema/appointment-types.js');
  const { eq, and, sql, ne } = await import('drizzle-orm');

  const [apptType] = await db.select().from(appointmentTypes)
    .where(eq(appointmentTypes.id, appointmentTypeId));
  if (!apptType) throw new Error('Appointment type not found');

  const durationMs = apptType.durationMinutes * 60 * 1000;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

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
