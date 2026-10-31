import { and, eq, sql } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../../lib/types.js';
import type { ListRoute, GetOneRoute, GetPdfRoute } from './invoices.routes.js';
import { db } from '../../../db/index.js';
import { invoices } from '../../../db/schema/invoices.js';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as invoiceService from '../../../services/invoice.service.js';

async function getMyInvoice(patientId: string, id: string) {
  const [invoice] = await db.select().from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.patientId, patientId)));
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return invoice;
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { page, per_page, from, to } = c.req.valid('query');
  const conditions = [eq(invoices.patientId, patientId)];
  if (from) conditions.push(sql`${invoices.issuedAt} >= ${from}`);
  if (to) conditions.push(sql`${invoices.issuedAt} <= ${to}`);
  const results = await db.select().from(invoices)
    .where(and(...conditions))
    .orderBy(invoices.issuedAt)
    .limit(per_page)
    .offset((page - 1) * per_page);
  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { id } = c.req.valid('param');
  return c.json(await getMyInvoice(patientId, id), HttpStatusCodes.OK);
};

export const getPdf: AppRouteHandler<GetPdfRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { id } = c.req.valid('param');
  const invoice = await getMyInvoice(patientId, id);
  if (invoice.pdfUrl) return c.redirect(invoice.pdfUrl);
  return c.html(invoiceService.generateInvoiceHtml(invoice));
};
