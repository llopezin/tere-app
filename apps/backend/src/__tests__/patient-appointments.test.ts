import { describe, it, expect } from 'vitest';
import './setup.js';
import { testDb } from './setup.js';
import { eq } from 'drizzle-orm';
import { createAppointmentType, createAppointment } from './helpers.js';
import { call, patientActor, professionalActor, link } from './http.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';

const P = '/api/v1/patient';

function futureDate(daysAhead: number, hourUtc = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

async function listNames(patient: Awaited<ReturnType<typeof patientActor>>) {
  const res = await call(patient, 'GET', `${P}/appointments`);
  const { data } = await res.json();
  return data.map((a: { professionalName: string; appointmentTypeName: string }) => [a.professionalName, a.appointmentTypeName]);
}

describe('Patient appointments list', () => {
  it('names the professional and appointment type of each appointment, across professionals', async () => {
    const ana = await professionalActor('Ana');
    const bruno = await professionalActor('Bruno');
    const patient = await patientActor('p');
    await link(ana, patient);
    await link(bruno, patient);
    const masaje = await createAppointmentType('Masaje', 60, ana.profileId);
    const valoracion = await createAppointmentType('Valoración', 60, bruno.profileId);
    for (const [prof, type, day] of [[ana, masaje, 3], [bruno, valoracion, 4]] as const) {
      await createAppointment({
        professionalId: prof.profileId, patientId: patient.profileId, appointmentTypeId: type.id,
        startAt: futureDate(day), endAt: futureDate(day, 11),
      });
    }

    expect(await listNames(patient)).toEqual([['Ana Pro', 'Masaje'], ['Bruno Pro', 'Valoración']]);
  });

  it('keeps the appointment type name after the type is deactivated', async () => {
    const ana = await professionalActor('Ana');
    const patient = await patientActor('p');
    await link(ana, patient);
    const masaje = await createAppointmentType('Masaje', 60, ana.profileId);
    await createAppointment({
      professionalId: ana.profileId, patientId: patient.profileId, appointmentTypeId: masaje.id,
      startAt: futureDate(3), endAt: futureDate(3, 11),
    });
    await testDb.update(appointmentTypes).set({ isActive: false }).where(eq(appointmentTypes.id, masaje.id));

    expect(await listNames(patient)).toEqual([['Ana Pro', 'Masaje']]);
  });
});
