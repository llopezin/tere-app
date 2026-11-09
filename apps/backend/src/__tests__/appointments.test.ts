/**
 * Booking rules, exercised through the BFF handlers that orchestrate them.
 * Ownership, double refunds, bono type and complete/no-show live in authorization.test.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
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
    await createBlockedTime(pro.profileId, futureDate(3, 9), futureDate(3, 13));
    expect((await book({ startAt: futureDate(3, 11).toISOString() })).status).toBe(409);
  });

  // BUG: no handler checks the working schedule; only availability does, so a direct POST books any hour.
  it.fails('rejects a patient booking outside the working schedule', async () => {
    const patient = await patientActor('p');
    const startAt = futureDate(3, 18);
    await createWorkingSchedule(pro.profileId, (startAt.getDay() + 6) % 7, '09:00', '10:00');
    const res = await call(patient, 'POST', '/api/v1/patient/appointments', {
      json: { appointmentTypeId: typeId, startAt: startAt.toISOString() },
    });
    expect(res.ok).toBe(false);
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

  // BUG: each slot is only checked against the database, never against the other slots of the same batch.
  it.fails('rejects a batch whose slots overlap each other', async () => {
    const startAt = futureDate(3).toISOString();
    const res = await call(pro, 'POST', `${PRO}/appointments/batch`, {
      json: { patientId, appointmentTypeId: typeId, slots: [{ startAt }, { startAt }] },
    });
    expect(res.ok).toBe(false);
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
    await createAppointment({ professionalId: pro.profileId, patientId, appointmentTypeId: typeId, startAt: futureDate(10), endAt: futureDate(10, 11) });
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
