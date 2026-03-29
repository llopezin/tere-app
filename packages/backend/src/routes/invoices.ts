import { Hono } from 'hono';
import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { appointments } from '../db/schema/appointments.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';
import { payments } from '../db/schema/payments.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createInvoiceSchema, paginationSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const invoiceRoutes = new Hono();

invoiceRoutes.use('*', authMiddleware);

// Helper: generate sequential invoice number
async function generateInvoiceNumber(professionalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  const [last] = await db.select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(and(
      eq(invoices.professionalId, professionalId),
      sql`${invoices.invoiceNumber} LIKE ${prefix + '%'}`
    ))
    .orderBy(sql`${invoices.invoiceNumber} DESC`)
    .limit(1);

  let nextNum = 1;
  if (last) {
    const lastNum = parseInt(last.invoiceNumber.replace(prefix, ''), 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

// GET /invoices
invoiceRoutes.get('/', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { page, per_page } = paginationSchema.parse(c.req.query());
  const patientId = c.req.query('patient_id');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const conditions = [];
  if (user.role === 'professional') {
    conditions.push(eq(invoices.professionalId, profileId));
  } else {
    conditions.push(eq(invoices.patientId, profileId));
  }
  if (patientId) conditions.push(eq(invoices.patientId, patientId));
  if (from) conditions.push(sql`${invoices.issuedAt} >= ${from}`);
  if (to) conditions.push(sql`${invoices.issuedAt} <= ${to}`);

  const results = await db.select().from(invoices)
    .where(and(...conditions))
    .orderBy(invoices.issuedAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page });
});

// POST /invoices — generate invoice
invoiceRoutes.post('/', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const body = createInvoiceSchema.parse(await c.req.json());

  // Get appointment
  const [appt] = await db.select().from(appointments)
    .where(eq(appointments.id, body.appointmentId));
  if (!appt) throw new AppError(404, 'Appointment not found');

  // Verify access
  if (user.role === 'professional' && appt.professionalId !== profileId) {
    throw new AppError(403, 'Not authorized');
  }
  if (user.role === 'patient' && appt.patientId !== profileId) {
    throw new AppError(403, 'Not authorized');
  }

  // Get professional data
  const [prof] = await db.select().from(professionals)
    .where(eq(professionals.id, appt.professionalId));
  if (!prof) throw new AppError(500, 'Professional not found');

  // Get patient data (billing override or personal)
  const [patient] = await db.select().from(patients)
    .where(eq(patients.id, appt.patientId));
  if (!patient) throw new AppError(500, 'Patient not found');

  const [billing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, appt.patientId));

  const patientName = billing?.billingName || `${patient.firstName} ${patient.lastName}`;
  const patientTaxId = billing?.taxId || null;
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

  // TODO: Generate PDF and upload, store pdf_url

  return c.json(invoice, 201);
});

// GET /invoices/:id
invoiceRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const conditions = [eq(invoices.id, id)];
  if (user.role === 'professional') {
    conditions.push(eq(invoices.professionalId, profileId));
  } else {
    conditions.push(eq(invoices.patientId, profileId));
  }

  const [invoice] = await db.select().from(invoices).where(and(...conditions));
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return c.json(invoice);
});

// GET /invoices/:id/pdf
invoiceRoutes.get('/:id/pdf', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const conditions = [eq(invoices.id, id)];
  if (user.role === 'professional') {
    conditions.push(eq(invoices.professionalId, profileId));
  } else {
    conditions.push(eq(invoices.patientId, profileId));
  }

  const [invoice] = await db.select().from(invoices).where(and(...conditions));
  if (!invoice) throw new AppError(404, 'Invoice not found');

  if (invoice.pdfUrl) {
    return c.redirect(invoice.pdfUrl);
  }

  // Generate simple HTML invoice as fallback
  const html = `
    <!DOCTYPE html>
    <html><head><title>Invoice ${invoice.invoiceNumber}</title>
    <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd;text-align:left}h1{color:#333}</style>
    </head><body>
    <h1>Invoice ${invoice.invoiceNumber}</h1>
    <p><strong>Date:</strong> ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
    <table>
      <tr><th>From</th><td>${invoice.profName}<br>${invoice.profTaxId || ''}<br>${invoice.profAddress || ''}</td></tr>
      <tr><th>To</th><td>${invoice.patientName}<br>${invoice.patientTaxId || ''}<br>${invoice.patientAddress || ''}</td></tr>
      <tr><th>Description</th><td>${invoice.description || ''}</td></tr>
      <tr><th>Amount</th><td>€${invoice.amount}</td></tr>
    </table>
    </body></html>
  `;

  return c.html(html);
});

export default invoiceRoutes;
