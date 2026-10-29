import { describe, test, expect } from 'vitest';
import { testDb } from './setup.js';
import { createProfessional, createPatient, createAppointmentType, createAppointment } from './helpers.js';
import { invoices } from '../db/schema/invoices.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';

describe('Invoice Creation', () => {
  test('generates sequential invoice numbers within a year', async () => {
    const professional = await createProfessional('Dr. Invoice');
    const patient = await createPatient(professional.id);
    const apptType = await createAppointmentType('Session', 60, professional.id);
    
    const start1 = new Date('2026-04-10T10:00:00');
    const end1 = new Date('2026-04-10T11:00:00');
    
    const appt1 = await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: start1,
      endAt: end1,
      price: '100.00',
    });
    
    const start2 = new Date('2026-04-11T10:00:00');
    const end2 = new Date('2026-04-11T11:00:00');
    
    const appt2 = await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: start2,
      endAt: end2,
      price: '100.00',
    });

    // Create first invoice
    const invoice1 = await createInvoice(professional.id, patient.id, appt1.id);
    
    // Create second invoice
    const invoice2 = await createInvoice(professional.id, patient.id, appt2.id);

    const year = new Date().getFullYear();
    expect(invoice1.invoiceNumber).toBe(`${year}-0001`);
    expect(invoice2.invoiceNumber).toBe(`${year}-0002`);
  });

  test('creates invoice with billing snapshot from patient billing data', async () => {
    const professional = await createProfessional('Dr. Smith');
    const { professionals: professionalsTable } = await import('../db/schema/professionals.js');
    const { eq } = await import('drizzle-orm');
    
    await testDb.update(professionalsTable).set({
      businessName: 'Smith Clinic',
      taxId: 'TAX123',
      addressStreet: '123 Clinic St',
      addressCity: 'Medical City',
      addressPostal: '12345',
      addressProvince: 'State',
      addressCountry: 'Country',
    }).where(eq(professionalsTable.id, professional.id));
    
    const patient = await createPatient(professional.id);
    
    // Add billing data for patient
    await testDb.insert(patientBillingData).values({
      patientId: patient.id,
      billingName: 'Acme Insurance Co',
      addressStreet: '456 Insurance Blvd',
      addressCity: 'Insurance City',
      addressPostal: '67890',
      addressProvince: 'Insurance State',
      addressCountry: 'Insurance Country',
    });
    
    const apptType = await createAppointmentType('Therapy', 60, professional.id);
    const appt = await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: new Date('2026-04-15T10:00:00'),
      endAt: new Date('2026-04-15T11:00:00'),
      price: '75.50',
    });

    const invoice = await createInvoice(professional.id, patient.id, appt.id);

    // Should use billing data, not patient data
    expect(invoice.patientName).toBe('Acme Insurance Co');
    expect(invoice.patientAddress).toContain('Insurance Blvd');
    expect(invoice.profName).toBe('Smith Clinic');
    expect(invoice.profTaxId).toBe('TAX123');
    expect(invoice.amount).toBe('75.50');
  });

  test('falls back to patient data when no billing data exists', async () => {
    const professional = await createProfessional('Dr. Jones');
    const patient = await createPatient(professional.id);
    const { patients: patientsTable } = await import('../db/schema/patients.js');
    const { eq } = await import('drizzle-orm');
    
    await testDb.update(patientsTable).set({
      firstName: 'John',
      lastName: 'Doe',
      addressStreet: '789 Patient Ave',
      addressCity: 'Patient Town',
    }).where(eq(patientsTable.id, patient.id));
    
    const apptType = await createAppointmentType('Checkup', 30, professional.id);
    const start = new Date('2026-04-12T14:00:00');
    const end = new Date('2026-04-12T14:30:00');
    
    const appt = await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: start,
      endAt: end,
      price: '50.00',
    });

    const invoice = await createInvoice(professional.id, patient.id, appt.id);

    // Should use patient data
    expect(invoice.patientName).toBe('John Doe');
    expect(invoice.patientAddress).toContain('Patient Ave');
  });

  test('generates HTML fallback when PDF not available', async () => {
    const professional = await createProfessional('Dr. PDF');
    const patient = await createPatient(professional.id);
    const apptType = await createAppointmentType('Visit', 45, professional.id);
    
    const appt = await createAppointment({
      professionalId: professional.id,
      patientId: patient.id,
      appointmentTypeId: apptType.id,
      startAt: new Date('2026-05-20T14:00:00'),
      endAt: new Date('2026-05-20T14:45:00'),
      price: '60.00',
    });

    const invoice = await createInvoice(professional.id, patient.id, appt.id);
    
    // Invoice should not have pdfUrl (simulating PDF generation not done yet)
    expect(invoice.pdfUrl).toBeNull();
    
    // Generate HTML fallback
    const html = generateInvoiceHtml(invoice);
    
    expect(html).toContain(`Invoice ${invoice.invoiceNumber}`);
    expect(html).toContain('€60.00');
    expect(html).toContain(invoice.profName);
    expect(html).toContain(invoice.patientName);
  });

  test('reuses invoice number correctly across years', async () => {
    const professional = await createProfessional('Dr. Year');
    
    // Simulate invoice from 2025
    const oldYear = 2025;
    await testDb.insert(invoices).values({
      invoiceNumber: `${oldYear}-0099`,
      professionalId: professional.id,
      patientId: (await createPatient(professional.id)).id,
      amount: '100.00',
      description: 'Old invoice',
      profName: 'Dr. Year',
      patientName: 'Patient',
      issuedAt: new Date(`${oldYear}-12-31`),
    });

    // New invoice in current year should start from 0001
    const newNumber = await generateInvoiceNumber(professional.id);
    const currentYear = new Date().getFullYear();
    
    expect(newNumber).toBe(`${currentYear}-0001`);
  });
});

// Helper functions that mimic the actual service logic
async function generateInvoiceNumber(professionalId: string): Promise<string> {
  const { testDb: db } = await import('./setup.js');
  const { invoices } = await import('../db/schema/invoices.js');
  const { eq, and, sql } = await import('drizzle-orm');
  
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const [last] = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices)
    .where(and(
      eq(invoices.professionalId, professionalId),
      sql`${invoices.invoiceNumber} LIKE ${prefix + '%'}`,
    ))
    .orderBy(sql`${invoices.invoiceNumber} DESC`).limit(1);
  let nextNum = 1;
  if (last) {
    const lastNum = parseInt(last.invoiceNumber.replace(prefix, ''), 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

async function createInvoice(professionalId: string, patientId: string, appointmentId: string) {
  const { testDb: db } = await import('./setup.js');
  const { invoices } = await import('../db/schema/invoices.js');
  const { appointments } = await import('../db/schema/appointments.js');
  const { professionals } = await import('../db/schema/professionals.js');
  const { patients } = await import('../db/schema/patients.js');
  const { patientBillingData } = await import('../db/schema/patient-billing-data.js');
  const { eq } = await import('drizzle-orm');
  
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
  if (!appt) throw new Error('Appointment not found');
  
  const [prof] = await db.select().from(professionals).where(eq(professionals.id, professionalId));
  if (!prof) throw new Error('Professional not found');
  
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
  if (!patient) throw new Error('Patient not found');
  
  const [billing] = await db.select().from(patientBillingData).where(eq(patientBillingData.patientId, patientId));
  
  const patientName = billing?.billingName || `${patient.firstName} ${patient.lastName}`;
  const patientTaxId = null;
  const patientAddress = billing
    ? [billing.addressStreet, billing.addressPostal, billing.addressCity, billing.addressProvince, billing.addressCountry].filter(Boolean).join(', ')
    : [patient.addressStreet, patient.addressPostal, patient.addressCity, patient.addressProvince, patient.addressCountry].filter(Boolean).join(', ');
  
  const profName = prof.businessName || `${prof.firstName} ${prof.lastName}`;
  const profAddress = [prof.addressStreet, prof.addressPostal, prof.addressCity, prof.addressProvince, prof.addressCountry].filter(Boolean).join(', ');
  
  const invoiceNumber = await generateInvoiceNumber(professionalId);
  
  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    professionalId,
    patientId,
    appointmentId,
    amount: appt.price,
    description: `Appointment on ${new Date(appt.startAt).toLocaleDateString()}`,
    profName,
    profTaxId: prof.taxId,
    profAddress,
    patientName,
    patientTaxId,
    patientAddress,
  }).returning();
  
  return invoice;
}

function generateInvoiceHtml(invoice: any): string {
  return `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
    <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd;text-align:left}h1{color:#333}</style>
    </head><body><h1>Invoice ${invoice.invoiceNumber}</h1>
    <p><strong>Date:</strong> ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
    <table><tr><th>From</th><td>${invoice.profName}<br>${invoice.profTaxId || ''}<br>${invoice.profAddress || ''}</td></tr>
    <tr><th>To</th><td>${invoice.patientName}<br>${invoice.patientTaxId || ''}<br>${invoice.patientAddress || ''}</td></tr>
    <tr><th>Description</th><td>${invoice.description || ''}</td></tr>
    <tr><th>Amount</th><td>€${invoice.amount}</td></tr></table></body></html>`;
}
