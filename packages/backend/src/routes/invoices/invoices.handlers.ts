import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, CreateRoute, GetOneRoute, GetPdfRoute } from './invoices.routes.js';
import { db } from '../../db/index.js';
import { invoices } from '../../db/schema/invoices.js';
import { appointments } from '../../db/schema/appointments.js';
import { professionals } from '../../db/schema/professionals.js';
import { patients } from '../../db/schema/patients.js';
import { patientBillingData } from '../../db/schema/patient-billing-data.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// --- Private helper ---

async function generateInvoiceNumber(professionalId: string): Promise<string> {
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

// --- Handlers ---

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { page, per_page, patient_id: patientId, from, to } = c.req.valid('query');
  const conditions = [];
  if (user.role === 'professional') conditions.push(eq(invoices.professionalId, profileId));
  else conditions.push(eq(invoices.patientId, profileId));
  if (patientId) conditions.push(eq(invoices.patientId, patientId));
  if (from) conditions.push(sql`${invoices.issuedAt} >= ${from}`);
  if (to) conditions.push(sql`${invoices.issuedAt} <= ${to}`);
  const results = await db.select().from(invoices)
    .where(and(...conditions))
    .orderBy(invoices.issuedAt)
    .limit(per_page)
    .offset((page - 1) * per_page);
  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, body.appointmentId));
  if (!appt) throw new AppError(404, 'Appointment not found');
  if (user.role === 'professional' && appt.professionalId !== profileId) throw new AppError(403, 'Not authorized');
  if (user.role === 'patient' && appt.patientId !== profileId) throw new AppError(403, 'Not authorized');
  const [prof] = await db.select().from(professionals).where(eq(professionals.id, appt.professionalId));
  if (!prof) throw new AppError(500, 'Professional not found');
  const [patient] = await db.select().from(patients).where(eq(patients.id, appt.patientId));
  if (!patient) throw new AppError(500, 'Patient not found');
  const [billing] = await db.select().from(patientBillingData).where(eq(patientBillingData.patientId, appt.patientId));
  const patientName = billing?.billingName || `${patient.firstName} ${patient.lastName}`;
  const patientTaxId = null;
  const patientAddress = billing
    ? [billing.addressStreet, billing.addressPostal, billing.addressCity, billing.addressProvince, billing.addressCountry].filter(Boolean).join(', ')
    : [patient.addressStreet, patient.addressPostal, patient.addressCity, patient.addressProvince, patient.addressCountry].filter(Boolean).join(', ');
  const profName = prof.businessName || `${prof.firstName} ${prof.lastName}`;
  const profAddress = [prof.addressStreet, prof.addressPostal, prof.addressCity, prof.addressProvince, prof.addressCountry].filter(Boolean).join(', ');
  const invoiceNumber = await generateInvoiceNumber(appt.professionalId);
  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    professionalId: appt.professionalId,
    patientId: appt.patientId,
    appointmentId: appt.id,
    paymentId: body.paymentId || null,
    amount: appt.price,
    description: `Appointment on ${new Date(appt.startAt).toLocaleDateString()}`,
    profName,
    profTaxId: prof.taxId,
    profAddress,
    patientName,
    patientTaxId,
    patientAddress,
  }).returning();
  return c.json(invoice, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const conditions = [eq(invoices.id, id)];
  if (user.role === 'professional') conditions.push(eq(invoices.professionalId, profileId));
  else conditions.push(eq(invoices.patientId, profileId));
  const [invoice] = await db.select().from(invoices).where(and(...conditions));
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return c.json(invoice, HttpStatusCodes.OK);
};

export const getPdf: AppRouteHandler<GetPdfRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const conditions = [eq(invoices.id, id)];
  if (user.role === 'professional') conditions.push(eq(invoices.professionalId, profileId));
  else conditions.push(eq(invoices.patientId, profileId));
  const [invoice] = await db.select().from(invoices).where(and(...conditions));
  if (!invoice) throw new AppError(404, 'Invoice not found');
  if (invoice.pdfUrl) return c.redirect(invoice.pdfUrl);
  const html = `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
    <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd;text-align:left}h1{color:#333}</style>
    </head><body><h1>Invoice ${invoice.invoiceNumber}</h1>
    <p><strong>Date:</strong> ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
    <table><tr><th>From</th><td>${invoice.profName}<br>${invoice.profTaxId || ''}<br>${invoice.profAddress || ''}</td></tr>
    <tr><th>To</th><td>${invoice.patientName}<br>${invoice.patientTaxId || ''}<br>${invoice.patientAddress || ''}</td></tr>
    <tr><th>Description</th><td>${invoice.description || ''}</td></tr>
    <tr><th>Amount</th><td>€${invoice.amount}</td></tr></table></body></html>`;
  return c.html(html);
};
