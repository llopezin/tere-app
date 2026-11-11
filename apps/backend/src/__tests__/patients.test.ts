/**
 * Patient identity rules (PRD "Reglas de negocio"): every patient has an email and a phone,
 * a unique DNI/NIE, and patients need the DNI/NIE to book.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from './setup.js';
import { eq } from 'drizzle-orm';
import { createAppointmentType } from './helpers.js';
import { call, patientActor, professionalActor, signUpPatient, type Actor } from './http.js';
import { patients } from '../db/schema/patients.js';
import { appointments } from '../db/schema/appointments.js';
import { user } from '../db/schema/auth-schema.js';

const P = '/api/v1/patient';
const PRO = '/api/v1/professional';
const NIE = '12345678Z';

let pro: Actor;
let patient: Actor;

beforeEach(async () => {
  pro = await professionalActor('pro');
  patient = await patientActor('p');
});

const newPatient = (nie: string) => ({ firstName: 'Ana', lastName: 'Ruiz', phone: '600111222', email: `ana-${nie}@test.com`, nie });

describe('Email and phone required', () => {
  it('rejects a patient signing up without a valid phone', async () => {
    for (const phone of [undefined, '', '123']) {
      const email = `no-phone-${crypto.randomUUID()}@test.com`;

      expect((await signUpPatient(email, { phone })).status).toBe(400);
      expect(await testDb.select().from(user).where(eq(user.email, email))).toHaveLength(0);
    }
  });

  it('rejects a professional creating a patient without an email', async () => {
    const withoutEmail = { ...newPatient('87654321X'), email: undefined };

    expect((await call(pro, 'POST', `${PRO}/patients`, { json: withoutEmail })).status).toBe(422);
  });
});

describe('Unique DNI/NIE', () => {
  it('rejects a patient saving a DNI/NIE another patient already has, whatever its case', async () => {
    await call(pro, 'POST', `${PRO}/patients`, { json: newPatient(NIE) });

    expect((await call(patient, 'PUT', `${P}/me`, { json: { nie: NIE } })).status).toBe(409);
    expect((await call(patient, 'PUT', `${P}/me`, { json: { nie: NIE.toLowerCase() } })).status).toBe(409);
  });

  it('lets a patient save their own DNI/NIE again', async () => {
    expect((await call(patient, 'PUT', `${P}/me`, { json: { nie: NIE } })).status).toBe(200);
    expect((await call(patient, 'PUT', `${P}/me`, { json: { nie: NIE } })).status).toBe(200);
  });

  it('rejects a professional creating a patient with a DNI/NIE that already exists', async () => {
    await call(patient, 'PUT', `${P}/me`, { json: { nie: NIE } });

    expect((await call(pro, 'POST', `${PRO}/patients`, { json: newPatient(NIE) })).status).toBe(409);
  });

  it('rejects a professional giving a patient a DNI/NIE another patient already has', async () => {
    await call(patient, 'PUT', `${P}/me`, { json: { nie: NIE } });
    const { id } = await (await call(pro, 'POST', `${PRO}/patients`, { json: newPatient('87654321X') })).json();

    expect((await call(pro, 'PUT', `${PRO}/patients/${id}`, { json: { nie: NIE } })).status).toBe(409);
  });
});

describe('DNI/NIE required to book', () => {
  it('rejects a patient booking without a saved DNI/NIE', async () => {
    const type = await createAppointmentType('Session', 60, pro.profileId);
    await testDb.update(patients).set({ nie: null }).where(eq(patients.id, patient.profileId));

    const res = await call(patient, 'POST', `${P}/appointments`, {
      json: { appointmentTypeId: type.id, startAt: new Date(Date.now() + 3 * 86_400_000).toISOString() },
    });

    expect(res.status).toBe(403);
    expect(await testDb.select().from(appointments)).toHaveLength(0);
  });
});
