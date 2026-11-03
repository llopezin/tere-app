/**
 * HTTP-level checks for the patient booking window (today → today + BOOKING_WINDOW_MONTHS, Madrid).
 * The window applies to the patient BFF only; the professional BFF is not limited.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
import { testDb } from './setup.js';
import { createAppointmentType } from './helpers.js';
import { call, patientActor, professionalActor, link, type Actor } from './http.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { getBookingWindowEnd, getClinicToday, toClinicDate } from '../lib/booking-window.js';

const P = '/api/v1/patient';
const PRO = '/api/v1/professional';
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD `days` after the `YYYY-MM-DD` date `ymd`. */
function addDays(ymd: string, days: number) {
  return new Date(Date.parse(ymd) + days * DAY_MS).toISOString().slice(0, 10);
}

let pro: Actor, patient: Actor;
let type: { id: string };
let windowEnd: Date, lastDay: string, today: string;

beforeEach(async () => {
  pro = await professionalActor('bw-pro');
  patient = await patientActor('bw-patient');
  await link(pro, patient);
  type = await createAppointmentType('Fisio', 60, pro.profileId);
  // Open every day 09:00-13:00 so every requested day has slots.
  await testDb.insert(workingSchedules).values(
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      professionalId: pro.profileId, dayOfWeek, startTime: '09:00', endTime: '13:00',
    })),
  );
  windowEnd = getBookingWindowEnd();
  lastDay = toClinicDate(windowEnd);
  today = getClinicToday();
});

function patientAvailability(from: string, to: string) {
  const qs = new URLSearchParams({ professional_id: pro.profileId, appointment_type_id: type.id, from, to });
  return call(patient, 'GET', `${P}/availability?${qs}`);
}

describe('Patient availability', () => {
  it('returns the last bookable day and no slots after the window', async () => {
    const res = await patientAvailability(addDays(lastDay, -3), addDays(lastDay, 3));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking_window_last_day).toBe(lastDay);
    expect(body.slots.length).toBeGreaterThan(0);
    for (const s of body.slots) {
      expect(new Date(s.start_at).getTime()).toBeLessThanOrEqual(windowEnd.getTime());
    }
  });

  it('returns no slots for a range entirely in the past', async () => {
    const res = await patientAvailability(addDays(today, -10), addDays(today, -1));
    expect(res.status).toBe(200);
    expect((await res.json()).slots).toEqual([]);
  });

  it('returns no slots for a range entirely beyond the window', async () => {
    const res = await patientAvailability(addDays(lastDay, 1), addDays(lastDay, 7));
    expect(res.status).toBe(200);
    expect((await res.json()).slots).toEqual([]);
  });

  it('rejects invalid ranges with 422', async () => {
    expect((await patientAvailability('not-a-date', today)).status).toBe(422);
    expect((await patientAvailability(addDays(today, 5), today)).status).toBe(422);
    expect((await patientAvailability(today, addDays(today, 31))).status).toBe(422);
    expect((await patientAvailability(today, addDays(today, 30))).status).toBe(200);
  });
});

describe('Patient booking', () => {
  const book = (startAt: Date) =>
    call(patient, 'POST', `${P}/appointments`, { json: { appointmentTypeId: type.id, startAt: startAt.toISOString() } });

  it('books inside the window', async () => {
    expect((await book(new Date(Date.now() + 7 * DAY_MS))).status).toBe(201);
  });

  it('rejects a booking beyond the window with BOOKING_OUTSIDE_WINDOW', async () => {
    const res = await book(new Date(windowEnd.getTime() + 1));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('BOOKING_OUTSIDE_WINDOW');
  });

  it('rejects a booking in the past with BOOKING_IN_PAST', async () => {
    const res = await book(new Date(Date.now() - DAY_MS));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('BOOKING_IN_PAST');
  });
});

describe('Professional BFF is not limited', () => {
  it('returns slots beyond the window and no booking_window_last_day', async () => {
    const qs = new URLSearchParams({ appointment_type_id: type.id, from: addDays(lastDay, 1), to: addDays(lastDay, 7) });
    const res = await call(pro, 'GET', `${PRO}/availability?${qs}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots.length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty('booking_window_last_day');
  });

  it('books beyond the window', async () => {
    const res = await call(pro, 'POST', `${PRO}/appointments`, {
      json: { patientId: patient.profileId, appointmentTypeId: type.id, startAt: new Date(windowEnd.getTime() + 7 * DAY_MS).toISOString() },
    });
    expect(res.status).toBe(201);
  });
});
