/**
 * Booking rules, exercised through the BFF handlers that orchestrate them.
 * Ownership, double refunds, bono type and complete/no-show live in authorization.test.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from './setup.js';
import { eq } from 'drizzle-orm';
import {
  createPatient, signRgpdConsent, createAppointmentType, createAppointment, createBono, createBlockedTime,
  createWorkingSchedule,
} from './helpers.js';
import { call, professionalActor, patientActor, type Actor } from './http.js';
import { appointments } from '../db/schema/appointments.js';
import { bonos } from '../db/schema/bonos.js';

const PRO = '/api/v1/professional';

function futureDate(daysAhead: number, hourUtc = 10, minutes = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hourUtc, minutes, 0, 0);
  return d;
}

let pro: Actor;
let patientId: string;
let typeId: string;

beforeEach(async () => {
  pro = await professionalActor('pro');
  patientId = (await createPatient(pro.profileId)).id;
  await signRgpdConsent(patientId);
  typeId = (await createAppointmentType('Session', 60, pro.profileId)).id;
});

const book = (json: Record<string, unknown>) =>
  call(pro, 'POST', `${PRO}/appointments`, { json: { patientId, appointmentTypeId: typeId, ...json } });

const appointmentCount = async () => (await testDb.select().from(appointments)).length;

// Rules where the exact status is up to the handler: any client error, and nothing written.
async function expectRejectedBooking(res: Response) {
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect(res.status).toBeLessThan(500);
  expect(await appointmentCount()).toBe(0);
}

// Schedules are read in the server's local time, so bookings tested against them are built in local time too
function localDate(daysAhead: number, hours: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, 0, 0, 0);
  return d;
}

const dayOfWeek = (d: Date) => (d.getDay() + 6) % 7;

async function bonoState(id: string) {
  const [bono] = await testDb.select().from(bonos).where(eq(bonos.id, id));
  return bono;
}

describe('Booking', () => {
  it('rejects booking for a patient without signed RGPD consent', async () => {
    const unsigned = await createPatient(pro.profileId);
    const res = await book({ patientId: unsigned.id, startAt: futureDate(3).toISOString() });
    expect(res.status).toBe(403);
  });

  it('rejects an appointment that overlaps another one', async () => {
    await createAppointment({ professionalId: pro.profileId, patientId, appointmentTypeId: typeId, startAt: futureDate(3), endAt: futureDate(3, 11) });
    expect((await book({ startAt: futureDate(3, 10, 30).toISOString() })).status).toBe(409);
  });

  it('rejects an appointment inside a blocked time', async () => {
    await createBlockedTime(pro.profileId, futureDate(3, 10, 30), futureDate(3, 11, 30));
    expect((await book({ startAt: futureDate(3, 10).toISOString() })).status).toBe(409);
  });

  it('rejects a patient booking outside the working schedule', async () => {
    const patient = await patientActor('p');
    const startAt = localDate(3, 18);
    await createWorkingSchedule(pro.profileId, dayOfWeek(startAt), '09:00', '10:00');
    const res = await call(patient, 'POST', '/api/v1/patient/appointments', {
      json: { appointmentTypeId: typeId, startAt: startAt.toISOString() },
    });
    await expectRejectedBooking(res);
  });

  it('lets a professional book outside their own working schedule', async () => {
    const startAt = localDate(3, 18);
    await createWorkingSchedule(pro.profileId, dayOfWeek(startAt), '09:00', '10:00');
    expect((await book({ startAt: startAt.toISOString() })).status).toBe(201);
  });

  it('rejects a patient booking in the past', async () => {
    const patient = await patientActor('p');
    // Inside the working schedule, so only the past-date rule can reject it
    const startAt = localDate(-1, 10);
    await createWorkingSchedule(pro.profileId, dayOfWeek(startAt), '09:00', '12:00');
    const res = await call(patient, 'POST', '/api/v1/patient/appointments', {
      json: { appointmentTypeId: typeId, startAt: startAt.toISOString() },
    });
    await expectRejectedBooking(res);
  });

  it('rejects a professional booking in the past', async () => {
    await expectRejectedBooking(await book({ startAt: futureDate(-1).toISOString() }));
  });
});

describe('Batch and recurring bookings', () => {
  it('creates no appointment of a batch when one of them fails', async () => {
    const bono = await createBono(pro.profileId, patientId, typeId, { totalSessions: 1 });
    const res = await call(pro, 'POST', `${PRO}/appointments/batch`, {
      json: { patientId, appointmentTypeId: typeId, bonoId: bono.id, slots: [{ startAt: futureDate(3).toISOString() }, { startAt: futureDate(4).toISOString() }] },
    });
    expect(res.status).toBe(400);
    expect(await appointmentCount()).toBe(0);
    expect((await bonoState(bono.id)).sessionsUsed).toBe(0);
  });

  it('rejects a batch whose slots overlap each other', async () => {
    const startAt = futureDate(3).toISOString();
    const res = await call(pro, 'POST', `${PRO}/appointments/batch`, {
      json: { patientId, appointmentTypeId: typeId, slots: [{ startAt }, { startAt }] },
    });
    expect(res.status).toBe(409);
    expect(await appointmentCount()).toBe(0);
  });

  it('creates no occurrence of a recurrence when one of them fails', async () => {
    const bono = await createBono(pro.profileId, patientId, typeId, { totalSessions: 2 });
    const res = await call(pro, 'POST', `${PRO}/appointments/recurring`, {
      json: { patientId, appointmentTypeId: typeId, bonoId: bono.id, startAt: futureDate(3).toISOString(), recurrenceRule: { frequency: 'weekly', count: 3 } },
    });
    expect(res.status).toBe(400);
    expect(await appointmentCount()).toBe(0);
    expect((await bonoState(bono.id)).sessionsUsed).toBe(0);
  });

  it('rejects a recurrence when any occurrence overlaps an existing appointment', async () => {
    await createAppointment({ professionalId: pro.profileId, patientId, appointmentTypeId: typeId, startAt: futureDate(10, 8), endAt: futureDate(10, 13) });
    // Wide on purpose: occurrences step in local days, so a DST change can shift them by an hour
    const res = await call(pro, 'POST', `${PRO}/appointments/recurring`, {
      json: { patientId, appointmentTypeId: typeId, startAt: futureDate(3).toISOString(), recurrenceRule: { frequency: 'weekly', count: 3 } },
    });
    expect(res.status).toBe(409);
    expect(await appointmentCount()).toBe(1);
  });
});

describe('Bonos', () => {
  it('deducts one bono session per booking', async () => {
    const bono = await createBono(pro.profileId, patientId, typeId, { totalSessions: 5 });
    expect((await book({ startAt: futureDate(3).toISOString(), bonoId: bono.id })).status).toBe(201);
    expect((await bonoState(bono.id)).sessionsUsed).toBe(1);
  });

  it('exhausts the bono on its last session and rejects further bookings with it', async () => {
    const bono = await createBono(pro.profileId, patientId, typeId, { totalSessions: 1 });
    expect((await book({ startAt: futureDate(3).toISOString(), bonoId: bono.id })).status).toBe(201);
    expect((await bonoState(bono.id)).status).toBe('exhausted');
    expect((await book({ startAt: futureDate(4).toISOString(), bonoId: bono.id })).status).toBe(400);
  });

  it('neither deducts nor refunds a session when the booking opts out of the bono', async () => {
    const bono = await createBono(pro.profileId, patientId, typeId, { totalSessions: 5, sessionsUsed: 2 });
    const { id } = await (await book({ startAt: futureDate(3).toISOString(), bonoId: bono.id, useBonoSession: false })).json();
    expect((await bonoState(bono.id)).sessionsUsed).toBe(2);
    expect((await call(pro, 'PATCH', `${PRO}/appointments/${id}/cancel`)).status).toBe(200);
    expect((await bonoState(bono.id)).sessionsUsed).toBe(2);
  });

  it('gives the session back when the appointment is cancelled', async () => {
    const bono = await createBono(pro.profileId, patientId, typeId, { totalSessions: 1 });
    const { id } = await (await book({ startAt: futureDate(3).toISOString(), bonoId: bono.id })).json();
    expect((await call(pro, 'PATCH', `${PRO}/appointments/${id}/cancel`)).status).toBe(200);
    expect(await bonoState(bono.id)).toMatchObject({ sessionsUsed: 0, status: 'active' });
  });
});

describe('Cancelling', () => {
  it('cannot cancel an appointment that has already started', async () => {
    const startAt = new Date(Date.now() - 10 * 60_000);
    const appt = await createAppointment({
      professionalId: pro.profileId, patientId, appointmentTypeId: typeId, startAt, endAt: new Date(startAt.getTime() + 3_600_000),
    });
    expect((await call(pro, 'PATCH', `${PRO}/appointments/${appt.id}/cancel`)).status).toBe(400);
  });
});
