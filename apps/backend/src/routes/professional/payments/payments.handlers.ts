import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, CreateRoute, GetOneRoute } from './payments.routes.js';
import { db } from '../../db/index.js';
import { payments } from '../../db/schema/payments.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page, from, to, patient_id: patientId, payment_method: paymentMethod } = c.req.valid('query');
  const conditions = [eq(payments.professionalId, profileId)];
  if (from) conditions.push(sql`${payments.paidAt} >= ${from}`);
  if (to) conditions.push(sql`${payments.paidAt} <= ${to}`);
  if (patientId) conditions.push(eq(payments.patientId, patientId));
  if (paymentMethod) conditions.push(eq(payments.paymentMethod, paymentMethod as any));
  const results = await db.select().from(payments)
    .where(and(...conditions))
    .orderBy(payments.paidAt)
    .limit(per_page)
    .offset((page - 1) * per_page);
  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  const [created] = await db.insert(payments).values({
    professionalId: profileId,
    patientId: body.patientId,
    appointmentId: body.appointmentId || null,
    bonoId: body.bonoId || null,
    amount: body.amount.toFixed(2),
    paymentMethod: body.paymentMethod,
    paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    notes: body.notes,
  }).returning();
  return c.json(created, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const [payment] = await db.select().from(payments)
    .where(and(eq(payments.id, id), eq(payments.professionalId, profileId)));
  if (!payment) throw new AppError(404, 'Payment not found');
  return c.json(payment, HttpStatusCodes.OK);
};
