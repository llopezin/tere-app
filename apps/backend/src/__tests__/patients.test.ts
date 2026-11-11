/**
 * DNI/NIE rules (PRD "Reglas de negocio"): every patient has a unique DNI/NIE, and patients need one to book.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from './setup.js';
import { eq } from 'drizzle-orm';
import { createAppointmentType } from './helpers.js';
import { call, patientActor, professionalActor, type Actor } from './http.js';
import { patients } from '../db/schema/patients.js';
import { appointments } from '../db/schema/appointments.js';

const P = '/api/v1/patient';
const PRO = '/api/v1/professional';
const NIE = '12345678Z';

let pro: Actor;
let patient: Actor;

beforeEach(async () => {
  pro = await professionalActor('pro');
  patient = await patientActor('p');
});

const newPatient = (nie: string) => ({ firstName: 'Ana', lastName: 'Ruiz', phone: '600111222', nie });

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
