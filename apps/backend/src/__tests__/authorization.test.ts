/**
 * HTTP-level authorization matrix for the patient and professional BFFs.
 *
 * Fixtures: professionals A and B; patients P1 (of A), P2 (of B), P3 (of A and B).
 * Checks, per area: wrong role -> 403, other app's Origin -> 403, same role but not owner -> 404,
 * foreign ids in the body -> 404, owner -> 2xx.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
import { testDb } from './setup.js';
import { and, eq } from 'drizzle-orm';
import { createAppointmentType, createAppointment, createBono } from './helpers.js';
import {
  call, signIn, signUpPatient, patientActor, professionalActor, link,
  CLIENT_ORIGIN, PROFESSIONAL_ORIGIN, type Actor,
} from './http.js';
import { user } from '../db/schema/auth-schema.js';
import { professionals } from '../db/schema/professionals.js';
import { appointments } from '../db/schema/appointments.js';
import { professionalPatients } from '../db/schema/professional-patients.js';
import { bonos } from '../db/schema/bonos.js';
import { consentDocuments } from '../db/schema/consent-documents.js';
import { patientConsents } from '../db/schema/patient-consents.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';

const P = '/api/v1/patient';
const PRO = '/api/v1/professional';

function futureDate(daysAhead: number, hourUtc = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

let A: Actor, B: Actor, P1: Actor, P2: Actor, P3: Actor;
let typeA: { id: string }, typeB: { id: string };
let bonoP1: { id: string }, bonoP2: { id: string };
let apptP1A: { id: string }, apptP2B: { id: string }, apptP3B: { id: string };

beforeEach(async () => {
  A = await professionalActor('a');
  B = await professionalActor('b');
  P1 = await patientActor('p1');
  P2 = await patientActor('p2');
  P3 = await patientActor('p3');
  await link(A, P1);
  await link(B, P2);
  await link(A, P3);
  await link(B, P3);

  typeA = await createAppointmentType('Fisio A', 60, A.profileId);
  typeB = await createAppointmentType('Fisio B', 60, B.profileId);
  bonoP1 = await createBono(A.profileId, P1.profileId, typeA.id);
  bonoP2 = await createBono(B.profileId, P2.profileId, typeB.id);

  const appt = (prof: Actor, pat: Actor, typeId: string, day: number) => createAppointment({
    professionalId: prof.profileId,
    patientId: pat.profileId,
    appointmentTypeId: typeId,
    startAt: futureDate(day),
    endAt: futureDate(day, 11),
  });
  apptP1A = await appt(A, P1, typeA.id, 5);
  apptP2B = await appt(B, P2, typeB.id, 6);
  apptP3B = await appt(B, P3, typeB.id, 7);
  await appt(A, P3, typeA.id, 8);
});

describe('Registration and login', () => {
  it('ignores a role sent on public sign-up: never creates a professional', async () => {
    const email = `intruder-${crypto.randomUUID()}@test.com`;
    await signUpPatient(email, { role: 'professional' });

    const [created] = await testDb.select().from(user).where(eq(user.email, email));
    if (created) expect(created.role).toBe('patient');
    const pros = await testDb.select().from(professionals).where(eq(professionals.email, email));
    expect(pros).toHaveLength(0);
  });

  it('rejects sign-up from professional-app', async () => {
    const res = await signUpPatient(`x-${crypto.randomUUID()}@test.com`, {}, PROFESSIONAL_ORIGIN);
    expect(res.status).toBe(403);
  });

  it('rejects each role on the other app with the generic credentials error', async () => {
    const [pro] = await testDb.select().from(user).where(eq(user.profileId, A.profileId));
    const [pat] = await testDb.select().from(user).where(eq(user.profileId, P1.profileId));

    const proOnClient = await signIn(pro.email, CLIENT_ORIGIN);
    expect(proOnClient.status).toBe(401);
    expect(proOnClient.headers.getSetCookie()).toHaveLength(0);

    const patOnPro = await signIn(pat.email, PROFESSIONAL_ORIGIN);
    expect(patOnPro.status).toBe(401);
  });
});

describe('BFF isolation (role + origin)', () => {
  it('requires a session', async () => {
    expect((await call(null, 'GET', `${P}/me`, { origin: CLIENT_ORIGIN })).status).toBe(401);
    expect((await call(null, 'GET', `${PRO}/me`, { origin: PROFESSIONAL_ORIGIN })).status).toBe(401);
  });

  it('rejects the wrong role', async () => {
    expect((await call(P1, 'GET', `${PRO}/patients`, { origin: PROFESSIONAL_ORIGIN })).status).toBe(403);
    expect((await call(A, 'GET', `${P}/me`, { origin: CLIENT_ORIGIN })).status).toBe(403);
  });

  it("rejects requests coming from the other app's origin", async () => {
    expect((await call(P1, 'GET', `${P}/me`, { origin: PROFESSIONAL_ORIGIN })).status).toBe(403);
    expect((await call(A, 'GET', `${PRO}/me`, { origin: CLIENT_ORIGIN })).status).toBe(403);
    expect((await call(P1, 'GET', `${P}/me`, { origin: 'https://evil.example' })).status).toBe(403);
  });

  it('accepts requests without Origin (same-origin / non-browser) when the role is right', async () => {
    expect((await call(P1, 'GET', `${P}/me`, { origin: null })).status).toBe(200);
  });

  it('no longer exposes the legacy shared routes', async () => {
    expect((await call(P1, 'POST', '/api/v1/appointments', { json: {} })).status).toBe(404);
    expect((await call(A, 'GET', '/api/v1/professionals')).status).toBe(404);
  });
});

describe('Patient BFF: only my own data', () => {
  it('returns my profile without clinical notes', async () => {
    const res = await call(P1, 'GET', `${P}/me`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(P1.profileId);
    expect(body).not.toHaveProperty('clinicalNotes');
    expect(body).not.toHaveProperty('professionalId');
  });

  it('books for myself even if another patientId is sent, and links me to the professional', async () => {
    const res = await call(P1, 'POST', `${P}/appointments`, {
      json: { patientId: P2.profileId, appointmentTypeId: typeB.id, startAt: futureDate(10).toISOString() },
    });
    expect(res.status).toBe(201);
    const appt = await res.json();
    expect(appt.patientId).toBe(P1.profileId);
    expect(appt.professionalId).toBe(B.profileId);

    const links = await testDb.select().from(professionalPatients)
      .where(and(eq(professionalPatients.professionalId, B.profileId), eq(professionalPatients.patientId, P1.profileId)));
    expect(links).toHaveLength(1);
  });

  it("cannot use another patient's bono", async () => {
    const res = await call(P1, 'POST', `${P}/appointments`, {
      json: { appointmentTypeId: typeB.id, startAt: futureDate(11).toISOString(), bonoId: bonoP2.id },
    });
    expect(res.status).toBe(404);
  });

  it("cannot read or cancel another patient's appointment", async () => {
    expect((await call(P1, 'GET', `${P}/appointments/${apptP2B.id}`)).status).toBe(404);
    expect((await call(P1, 'PATCH', `${P}/appointments/${apptP2B.id}/cancel`)).status).toBe(404);
    expect((await call(P1, 'GET', `${P}/appointments/${apptP1A.id}`)).status).toBe(200);
  });

  it('lists only my appointments', async () => {
    const res = await call(P1, 'GET', `${P}/appointments`);
    const { data } = await res.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((a: { patientId: string }) => a.patientId === P1.profileId)).toBe(true);
  });

  it("cannot read another patient's bono", async () => {
    expect((await call(P1, 'GET', `${P}/bonos/${bonoP2.id}`)).status).toBe(404);
    expect((await call(P1, 'GET', `${P}/bonos/${bonoP1.id}`)).status).toBe(200);
  });

  it("rejects availability for an appointment type of another professional", async () => {
    const qs = new URLSearchParams({
      professional_id: A.profileId, appointment_type_id: typeB.id,
      from: futureDate(1).toISOString(), to: futureDate(7).toISOString(),
    });
    expect((await call(P1, 'GET', `${P}/availability?${qs}`)).status).toBe(404);
  });

  it('lists bookable professionals with public fields only', async () => {
    const res = await call(P1, 'GET', `${P}/professionals`);
    const { data } = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(data[0]).sort()).toEqual(['businessName', 'firstName', 'id', 'lastName']);
  });
});

describe('Professional BFF: only my data and my patients', () => {
  it('lists only my patients', async () => {
    const res = await call(A, 'GET', `${PRO}/patients`);
    const ids = (await res.json()).data.map((p: { id: string }) => p.id);
    expect(ids).toEqual(expect.arrayContaining([P1.profileId, P3.profileId]));
    expect(ids).not.toContain(P2.profileId);
  });

  it("cannot access another professional's patient or its sub-resources", async () => {
    for (const path of ['', '/appointments', '/bonos', '/payments', '/billing-data', '/rgpd-consent', '/contact-link', '/consents']) {
      expect((await call(A, 'GET', `${PRO}/patients/${P2.profileId}${path}`)).status, path).toBe(404);
    }
    const rgpd = await call(A, 'POST', `${PRO}/patients/${P2.profileId}/rgpd-consent`, { json: { signatureData: 'x', signed: true } });
    expect(rgpd.status).toBe(404);
  });

  it('sees only its own appointments of a shared patient', async () => {
    const res = await call(A, 'GET', `${PRO}/patients/${P3.profileId}/appointments`);
    const { data } = await res.json();
    expect(data.length).toBe(1);
    expect(data.every((a: { professionalId: string }) => a.professionalId === A.profileId)).toBe(true);
  });

  it('keeps clinical notes per professional', async () => {
    const put = await call(B, 'PUT', `${PRO}/patients/${P3.profileId}`, { json: { clinicalNotes: 'notas de B' } });
    expect(put.status).toBe(200);
    expect((await put.json()).clinicalNotes).toBe('notas de B');

    const seenByA = await (await call(A, 'GET', `${PRO}/patients/${P3.profileId}`)).json();
    expect(seenByA.clinicalNotes).toBeNull();
  });

  it('cannot edit personal data of a patient that has an account', async () => {
    const res = await call(A, 'PUT', `${PRO}/patients/${P1.profileId}`, { json: { firstName: 'Hacked' } });
    expect(res.status).toBe(403);
  });

  it('creates patients linked only to itself', async () => {
    const res = await call(A, 'POST', `${PRO}/patients`, { json: { firstName: 'Nuevo', lastName: 'Paciente', phone: '+34600111222' } });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect((await call(A, 'GET', `${PRO}/patients/${created.id}`)).status).toBe(200);
    expect((await call(B, 'GET', `${PRO}/patients/${created.id}`)).status).toBe(404);
  });

  it('rejects foreign ids when booking', async () => {
    const startAt = futureDate(12).toISOString();
    const notMyPatient = await call(A, 'POST', `${PRO}/appointments`, { json: { patientId: P2.profileId, appointmentTypeId: typeA.id, startAt } });
    expect(notMyPatient.status).toBe(404);
    const notMyType = await call(A, 'POST', `${PRO}/appointments`, { json: { patientId: P1.profileId, appointmentTypeId: typeB.id, startAt } });
    expect(notMyType.status).toBe(404);
    const notMyBono = await call(A, 'POST', `${PRO}/appointments`, { json: { patientId: P1.profileId, appointmentTypeId: typeA.id, startAt, bonoId: bonoP2.id } });
    expect(notMyBono.status).toBe(404);
    const ok = await call(A, 'POST', `${PRO}/appointments`, { json: { patientId: P1.profileId, appointmentTypeId: typeA.id, startAt, bonoId: bonoP1.id } });
    expect(ok.status).toBe(201);
  });

  it('rejects foreign ids in batch and recurring bookings', async () => {
    const batch = await call(A, 'POST', `${PRO}/appointments/batch`, {
      json: { patientId: P2.profileId, appointmentTypeId: typeA.id, slots: [{ startAt: futureDate(13).toISOString() }] },
    });
    expect(batch.status).toBe(404);
    const recurring = await call(A, 'POST', `${PRO}/appointments/recurring`, {
      json: { patientId: P1.profileId, appointmentTypeId: typeB.id, startAt: futureDate(14).toISOString(), recurrenceRule: { frequency: 'weekly', count: 2 } },
    });
    expect(recurring.status).toBe(404);
  });

  it("cannot read or modify another professional's appointment", async () => {
    expect((await call(A, 'GET', `${PRO}/appointments/${apptP2B.id}`)).status).toBe(404);
    expect((await call(A, 'PATCH', `${PRO}/appointments/${apptP3B.id}/cancel`)).status).toBe(404);
    expect((await call(A, 'PATCH', `${PRO}/appointments/${apptP2B.id}/complete`)).status).toBe(404);
    expect((await call(A, 'PUT', `${PRO}/appointments/${apptP1A.id}`, { json: { appointmentTypeId: typeB.id } })).status).toBe(404);
    const [untouched] = await testDb.select().from(appointments).where(eq(appointments.id, apptP1A.id));
    expect(untouched.appointmentTypeId).toBe(typeA.id);
  });

  it('rejects foreign ids on bonos and payments', async () => {
    const bono = await call(A, 'POST', `${PRO}/bonos`, { json: { patientId: P2.profileId, appointmentTypeId: typeA.id, name: 'x', price: 100, totalSessions: 5 } });
    expect(bono.status).toBe(404);
    const bonoOtherType = await call(A, 'POST', `${PRO}/bonos`, { json: { patientId: P1.profileId, appointmentTypeId: typeB.id, name: 'x', price: 100, totalSessions: 5 } });
    expect(bonoOtherType.status).toBe(404);
    expect((await call(A, 'GET', `${PRO}/bonos/${bonoP2.id}`)).status).toBe(404);

    const payNotMine = await call(A, 'POST', `${PRO}/payments`, { json: { patientId: P2.profileId, amount: 50, paymentMethod: 'cash' } });
    expect(payNotMine.status).toBe(404);
    const payOtherAppt = await call(A, 'POST', `${PRO}/payments`, { json: { patientId: P3.profileId, appointmentId: apptP3B.id, amount: 50, paymentMethod: 'cash' } });
    expect(payOtherAppt.status).toBe(404);
  });

  it('rejects availability for an appointment type of another professional', async () => {
    const qs = new URLSearchParams({ appointment_type_id: typeB.id, from: futureDate(1).toISOString(), to: futureDate(7).toISOString() });
    expect((await call(A, 'GET', `${PRO}/availability?${qs}`)).status).toBe(404);
  });
});

describe('Review hardening', () => {
  it('cannot change role or profileId through update-user', async () => {
    const res = await call(P1, 'POST', '/api/auth/update-user', { json: { role: 'professional', profileId: A.profileId } });
    expect(res.ok).toBe(false);
    const [u] = await testDb.select().from(user).where(eq(user.profileId, P1.profileId));
    expect(u.role).toBe('patient');
  });

  it('cancelling twice does not refund the bono twice', async () => {
    const book = await call(P1, 'POST', `${P}/appointments`, {
      json: { appointmentTypeId: typeA.id, startAt: futureDate(15).toISOString(), bonoId: bonoP1.id },
    });
    expect(book.status).toBe(201);
    const { id } = await book.json();
    expect((await call(P1, 'PATCH', `${P}/appointments/${id}/cancel`)).status).toBe(200);
    expect((await call(P1, 'PATCH', `${P}/appointments/${id}/cancel`)).status).toBe(409);
    const [bono] = await testDb.select().from(bonos).where(eq(bonos.id, bonoP1.id));
    expect(bono.sessionsUsed).toBe(0);
  });

  it('only scheduled appointments can be completed or marked no-show', async () => {
    expect((await call(A, 'PATCH', `${PRO}/appointments/${apptP1A.id}/complete`)).status).toBe(200);
    expect((await call(A, 'PATCH', `${PRO}/appointments/${apptP1A.id}/no-show`)).status).toBe(409);
    expect((await call(A, 'PATCH', `${PRO}/appointments/${apptP2B.id}/no-show`)).status).toBe(404);
  });

  it('a bono only pays for its own appointment type', async () => {
    const otherTypeA = await createAppointmentType('Otro A', 30, A.profileId);
    const res = await call(P1, 'POST', `${P}/appointments`, {
      json: { appointmentTypeId: otherTypeA.id, startAt: futureDate(16).toISOString(), bonoId: bonoP1.id },
    });
    expect(res.status).toBe(404);
    const pro = await call(A, 'POST', `${PRO}/appointments`, {
      json: { patientId: P1.profileId, appointmentTypeId: otherTypeA.id, startAt: futureDate(16).toISOString(), bonoId: bonoP1.id },
    });
    expect(pro.status).toBe(404);
  });

  it('shared billing and RGPD data of a patient with an account are read-only for professionals', async () => {
    const billing = { billingName: 'Otro nombre', addressStreet: 'x', addressPostal: '28001', addressCity: 'Madrid', addressProvince: 'Madrid' };
    expect((await call(A, 'PUT', `${PRO}/patients/${P1.profileId}/billing-data`, { json: billing })).status).toBe(403);
    expect(await testDb.select().from(patientBillingData).where(eq(patientBillingData.patientId, P1.profileId))).toHaveLength(0);
    expect((await call(A, 'POST', `${PRO}/patients/${P1.profileId}/rgpd-consent`, { json: { signatureData: 'x', signed: true } })).status).toBe(403);

    // Patients created by the professional (no account) remain editable
    const created = await (await call(A, 'POST', `${PRO}/patients`, { json: { firstName: 'Sin', lastName: 'Cuenta', phone: '+34600111333' } })).json();
    expect((await call(A, 'PUT', `${PRO}/patients/${created.id}/billing-data`, { json: billing })).status).toBeLessThan(300);
  });

  it('escapes user-controlled fields in the invoice HTML and forbids scripts', async () => {
    await call(P1, 'PUT', `${P}/me/billing-data`, {
      json: { billingName: '<script>alert(1)</script>', addressStreet: 'x', addressPostal: '28001', addressCity: 'Madrid', addressProvince: 'Madrid' },
    });
    const inv = await call(A, 'POST', `${PRO}/invoices`, { json: { appointmentId: apptP1A.id } });
    expect(inv.status).toBe(201);
    const { id } = await inv.json();

    const pdf = await call(A, 'GET', `${PRO}/invoices/${id}/pdf`);
    const html = await pdf.text();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(pdf.headers.get('content-security-policy')).toContain("default-src 'none'");

    // and the patient sees only their own invoices
    expect((await call(P1, 'GET', `${P}/invoices/${id}/pdf`)).status).toBe(200);
    expect((await call(P2, 'GET', `${P}/invoices/${id}`)).status).toBe(404);
    expect((await call(P2, 'GET', `${P}/invoices/${id}/pdf`)).status).toBe(404);
  });

  it('rejects invoices for appointments or payments that are not mine', async () => {
    expect((await call(A, 'POST', `${PRO}/invoices`, { json: { appointmentId: apptP2B.id } })).status).toBe(404);
    const pay = await (await call(B, 'POST', `${PRO}/payments`, { json: { patientId: P3.profileId, amount: 50, paymentMethod: 'cash' } })).json();
    const otherPatientPay = await (await call(A, 'POST', `${PRO}/payments`, { json: { patientId: P3.profileId, amount: 50, paymentMethod: 'cash' } })).json();
    expect((await call(A, 'POST', `${PRO}/invoices`, { json: { appointmentId: apptP1A.id, paymentId: pay.id } })).status).toBe(404);
    // payment is mine but belongs to another patient than the appointment
    expect((await call(A, 'POST', `${PRO}/invoices`, { json: { appointmentId: apptP1A.id, paymentId: otherPatientPay.id } })).status).toBe(404);
  });

  it("cannot deduct or list transactions of another professional's bono", async () => {
    expect((await call(A, 'POST', `${PRO}/bonos/${bonoP2.id}/deduct`, { json: {} })).status).toBe(404);
    expect((await call(A, 'GET', `${PRO}/bonos/${bonoP2.id}/transactions`)).status).toBe(404);
  });

  it("cannot use or modify another professional's consent documents, types or blocked times", async () => {
    const [docB] = await testDb.insert(consentDocuments).values({ professionalId: B.profileId, title: 'Doc B', content: 'c' }).returning();
    expect((await call(A, 'POST', `${PRO}/patients/${P3.profileId}/consents`, { json: { consentDocumentId: docB.id } })).status).toBe(404);
    expect((await call(A, 'GET', `${PRO}/consent-documents/${docB.id}`)).status).toBe(404);
    expect((await call(A, 'PUT', `${PRO}/consent-documents/${docB.id}`, { json: { title: 'x' } })).status).toBe(404);
    expect((await call(A, 'DELETE', `${PRO}/consent-documents/${docB.id}`)).status).toBe(404);
    expect((await call(A, 'PUT', `${PRO}/appointment-types/${typeB.id}`, { json: { name: 'x' } })).status).toBe(404);
    expect((await call(A, 'DELETE', `${PRO}/appointment-types/${typeB.id}`)).status).toBe(404);

    const blocked = await (await call(B, 'POST', `${PRO}/blocked-times`, {
      json: { startAt: futureDate(20).toISOString(), endAt: futureDate(20, 12).toISOString() },
    })).json();
    expect((await call(A, 'DELETE', `${PRO}/blocked-times/${blocked.id}`)).status).toBe(404);
  });

  it("cannot read or sign another patient's consent", async () => {
    const [docA] = await testDb.insert(consentDocuments).values({ professionalId: A.profileId, title: 'Doc A', content: 'c' }).returning();
    const [consentP3] = await testDb.insert(patientConsents)
      .values({ consentDocumentId: docA.id, patientId: P3.profileId, professionalId: A.profileId }).returning();
    expect((await call(P1, 'GET', `${P}/consents/${consentP3.id}`)).status).toBe(404);
    expect((await call(P1, 'POST', `${P}/consents/${consentP3.id}/sign`, { json: { signatureData: 'x' } })).status).toBe(404);
    expect((await call(P3, 'GET', `${P}/consents/${consentP3.id}`)).status).toBe(200);
  });
});
