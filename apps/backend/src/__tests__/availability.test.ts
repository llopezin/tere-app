import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
import {
  createProfessional, createPatient, createAppointmentType, createAppointment, createBlockedTime, createWorkingSchedule,
} from './helpers.js';
import { generateAvailableSlots } from '../services/availability.service.js';

// The service reads schedules in the server's local time, so the fixtures are built in local time too.
const day = new Date();
day.setDate(day.getDate() + 7);
day.setHours(0, 0, 0, 0);
const dayOfWeek = (day.getDay() + 6) % 7;

function at(hours: number, minutes = 0) {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

let professionalId: string, patientId: string, typeId: string;

beforeEach(async () => {
  const professional = await createProfessional();
  professionalId = professional.id;
  patientId = (await createPatient(professionalId)).id;
  typeId = (await createAppointmentType('Session', 60, professionalId)).id;
});

async function slotStarts(appointmentTypeId = typeId) {
  const slots = await generateAvailableSlots(professionalId, appointmentTypeId, day, day);
  return slots.map((s) => s.start_at);
}

const iso = (...dates: Date[]) => dates.map((d) => d.toISOString());

describe('Available slots', () => {
  it('offers slots only inside the working schedule', async () => {
    await createWorkingSchedule(professionalId, dayOfWeek, '09:00', '12:00');
    expect(await slotStarts()).toEqual(iso(at(9), at(10), at(11)));
  });

  it('offers no slots on a day without working schedule', async () => {
    await createWorkingSchedule(professionalId, (dayOfWeek + 1) % 7, '09:00', '12:00');
    expect(await slotStarts()).toEqual([]);
  });

  it('sizes slots by the appointment type duration and never runs past the schedule end', async () => {
    await createWorkingSchedule(professionalId, dayOfWeek, '09:00', '11:00');
    const shortType = await createAppointmentType('Short', 45, professionalId);
    expect(await slotStarts(shortType.id)).toEqual(iso(at(9), at(9, 45)));
  });

  it('excludes slots taken by an existing appointment', async () => {
    await createWorkingSchedule(professionalId, dayOfWeek, '09:00', '12:00');
    await createAppointment({ professionalId, patientId, appointmentTypeId: typeId, startAt: at(10), endAt: at(11) });
    expect(await slotStarts()).toEqual(iso(at(9), at(11)));
  });

  it('excludes every slot that partially overlaps a blocked time', async () => {
    await createWorkingSchedule(professionalId, dayOfWeek, '09:00', '13:00');
    await createBlockedTime(professionalId, at(10, 30), at(11, 30));
    expect(await slotStarts()).toEqual(iso(at(9), at(12)));
  });

  it('does not count cancelled appointments as taken', async () => {
    await createWorkingSchedule(professionalId, dayOfWeek, '09:00', '11:00');
    await createAppointment({
      professionalId, patientId, appointmentTypeId: typeId, startAt: at(9), endAt: at(10), status: 'cancelled',
    });
    expect(await slotStarts()).toEqual(iso(at(9), at(10)));
  });
});
