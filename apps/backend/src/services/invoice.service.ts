import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { appointments } from '../db/schema/appointments.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';
import { eq, and, sql } from 'drizzle-orm';

export async function generateInvoiceNumber(professionalId: string): Promise<string> {
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

export async function createInvoiceForAppointment(
  appointmentId: string,
  paymentId?: string | null,
  preloadedAppointment?: typeof appointments.$inferSelect
) {
  const appt = preloadedAppointment
    ?? (await db.select().from(appointments).where(eq(appointments.id, appointmentId)))[0];
  if (!appt) {
    throw new Error('Appointment not found');
  }

  const [prof] = await db.select().from(professionals).where(eq(professionals.id, appt.professionalId));
  if (!prof) {
    throw new Error('Professional not found');
  }

  const [patient] = await db.select().from(patients).where(eq(patients.id, appt.patientId));
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Get billing data (if exists)
  const [billing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, appt.patientId));

  // Build billing snapshot
  const patientName = billing?.billingName || `${patient.firstName} ${patient.lastName}`;
  const patientTaxId = null;
  const patientAddress = billing
    ? [billing.addressStreet, billing.addressPostal, billing.addressCity, billing.addressProvince, billing.addressCountry]
        .filter(Boolean).join(', ')
    : [patient.addressStreet, patient.addressPostal, patient.addressCity, patient.addressProvince, patient.addressCountry]
        .filter(Boolean).join(', ');

  const profName = prof.businessName || `${prof.firstName} ${prof.lastName}`;
  const profAddress = [prof.addressStreet, prof.addressPostal, prof.addressCity, prof.addressProvince, prof.addressCountry]
    .filter(Boolean).join(', ');

  const invoiceNumber = await generateInvoiceNumber(appt.professionalId);

  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    professionalId: appt.professionalId,
    patientId: appt.patientId,
    appointmentId: appt.id,
    paymentId: paymentId || null,
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

/** Escapes text interpolated into the invoice HTML (fields come from user-editable billing data). */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The invoice page is served from the API origin, so it must never run scripts:
 * besides escaping, handlers send INVOICE_HTML_CSP.
 */
export const INVOICE_HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'";

export function generateInvoiceHtml(invoice: typeof invoices.$inferSelect): string {
  const e = escapeHtml;
  return `<!DOCTYPE html><html><head><title>Invoice ${e(invoice.invoiceNumber)}</title>
    <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd;text-align:left}h1{color:#333}</style>
    </head><body><h1>Invoice ${e(invoice.invoiceNumber)}</h1>
    <p><strong>Date:</strong> ${e(new Date(invoice.issuedAt).toLocaleDateString())}</p>
    <table><tr><th>From</th><td>${e(invoice.profName)}<br>${e(invoice.profTaxId)}<br>${e(invoice.profAddress)}</td></tr>
    <tr><th>To</th><td>${e(invoice.patientName)}<br>${e(invoice.patientTaxId)}<br>${e(invoice.patientAddress)}</td></tr>
    <tr><th>Description</th><td>${e(invoice.description)}</td></tr>
    <tr><th>Amount</th><td>€${e(invoice.amount)}</td></tr></table></body></html>`;
}
