import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, CreateRoute, GetOneRoute, GetPdfRoute } from './invoices.routes.js';
import { db } from '../../db/index.js';
import { invoices } from '../../db/schema/invoices.js';
import { appointments } from '../../db/schema/appointments.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as invoiceService from '../../services/invoice.service.js';

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
  
  const html = invoiceService.generateInvoiceHtml(invoice);
  return c.html(html);
};
