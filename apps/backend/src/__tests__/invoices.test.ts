import { describe, it, expect } from 'vitest';
import './setup.js';
import { testDb } from './setup.js';
import { eq } from 'drizzle-orm';
import { createProfessional, createPatient, createAppointmentType, createAppointment } from './helpers.js';
import { createInvoiceForAppointment } from '../services/invoice.service.js';
import { invoices } from '../db/schema/invoices.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';

const year = new Date().getFullYear();

async function appointmentFor(professionalId: string, patientId?: string) {
  const patient = patientId ?? (await createPatient(professionalId)).id;
  const type = await createAppointmentType(`Session ${crypto.randomUUID()}`, 60, professionalId);
  const startAt = new Date(Date.now() + 86_400_000);
  return createAppointment({
    professionalId, patientId: patient, appointmentTypeId: type.id, startAt, endAt: new Date(startAt.getTime() + 3_600_000),
  });
}

async function invoiceFor(professionalId: string, patientId?: string) {
  const appt = await appointmentFor(professionalId, patientId);
  return createInvoiceForAppointment(appt.id);
}

describe('Invoice numbering', () => {
  it('numbers the invoices of a professional correlatively within the year', async () => {
    const professional = await createProfessional();
    expect((await invoiceFor(professional.id)).invoiceNumber).toBe(`${year}-0001`);
    expect((await invoiceFor(professional.id)).invoiceNumber).toBe(`${year}-0002`);
  });

  it('restarts the numbering every year', async () => {
    const professional = await createProfessional();
    const previous = await invoiceFor(professional.id);
    await testDb.update(invoices).set({ invoiceNumber: `${year - 1}-0007` }).where(eq(invoices.id, previous.id));

    expect((await invoiceFor(professional.id)).invoiceNumber).toBe(`${year}-0001`);
  });

  // BUG: invoice_number is unique across all professionals, so B's first invoice collides with A's `<year>-0001`.
  it.fails('keeps a separate sequence per professional', async () => {
    const a = await createProfessional('Pro A');
    const b = await createProfessional('Pro B');
    await invoiceFor(a.id);
    expect((await invoiceFor(b.id)).invoiceNumber).toBe(`${year}-0001`);
  });
});

describe('Invoice billing snapshot', () => {
  it('copies the billing data at issue time, so later edits do not change the invoice', async () => {
    const professional = await createProfessional('Ana Pro', {
      businessName: 'Clinic Ana', taxId: 'B12345678', addressStreet: 'Calle Mayor 1', addressCity: 'Madrid',
    });
    const patient = await createPatient(professional.id);
    await testDb.insert(patientBillingData).values({
      patientId: patient.id, billingName: 'Billing Name', addressStreet: 'Gran Via 2', addressCity: 'Madrid',
    });

    const invoice = await invoiceFor(professional.id, patient.id);
    await testDb.update(patientBillingData).set({ billingName: 'Changed' }).where(eq(patientBillingData.patientId, patient.id));
    const [stored] = await testDb.select().from(invoices).where(eq(invoices.id, invoice.id));

    expect(stored).toMatchObject({
      profName: 'Clinic Ana',
      profTaxId: 'B12345678',
      profAddress: 'Calle Mayor 1, Madrid, España',
      patientName: 'Billing Name',
      patientAddress: 'Gran Via 2, Madrid',
    });
  });

  it("falls back to the patient's own name and address without billing data", async () => {
    const professional = await createProfessional();
    const patient = await createPatient(professional.id, {
      firstName: 'Luis', lastName: 'Gomez', addressStreet: 'Calle Sol 3', addressCity: 'Sevilla',
    });

    const invoice = await invoiceFor(professional.id, patient.id);

    expect(invoice).toMatchObject({ patientName: 'Luis Gomez', patientAddress: 'Calle Sol 3, Sevilla, España' });
  });
});
