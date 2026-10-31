import type { AppRouteHandler } from '../../../lib/types.js';
import type { ListRoute, CreateRoute, GetOneRoute, GetPdfRoute } from './invoices.routes.js';
import { db } from '../../../db/index.js';
import { invoices } from '../../../db/schema/invoices.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as invoiceService from '../../../services/invoice.service.js';
import { assertAppointmentOf, assertPaymentOf, assertPatientOfProfessional } from '../../../services/ownership.service.js';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page, patient_id: patientId, from, to } = c.req.valid('query');
  const conditions = [];
  conditions.push(eq(invoices.professionalId, profileId));
  if (patientId) {
    await assertPatientOfProfessional(profileId, patientId);
    conditions.push(eq(invoices.patientId, patientId));
  }
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
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  
  const appt = await assertAppointmentOf({ professionalId: profileId }, body.appointmentId);
  if (body.paymentId) {
    // The payment must be ours and belong to the same patient as the appointment
    await assertPaymentOf({ professionalId: profileId, patientId: appt.patientId }, body.paymentId);
  }

  try {
    const invoice = await invoiceService.createInvoiceForAppointment(body.appointmentId, body.paymentId, appt);
    return c.json(invoice, HttpStatusCodes.CREATED);
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(500, error.message);
    }
    throw error;
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const conditions = [eq(invoices.id, id)];
  conditions.push(eq(invoices.professionalId, profileId));
  const [invoice] = await db.select().from(invoices).where(and(...conditions));
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return c.json(invoice, HttpStatusCodes.OK);
};

export const getPdf: AppRouteHandler<GetPdfRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const conditions = [eq(invoices.id, id)];
  conditions.push(eq(invoices.professionalId, profileId));
  const [invoice] = await db.select().from(invoices).where(and(...conditions));
  if (!invoice) throw new AppError(404, 'Invoice not found');
  if (invoice.pdfUrl) return c.redirect(invoice.pdfUrl);

  c.header('Content-Security-Policy', invoiceService.INVOICE_HTML_CSP);
  return c.html(invoiceService.generateInvoiceHtml(invoice));
};
