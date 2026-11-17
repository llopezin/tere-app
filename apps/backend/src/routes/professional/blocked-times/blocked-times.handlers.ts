import type { AppRouteHandler } from '../../../lib/types.js';
import type { ListRoute, CreateRoute, RemoveRoute } from './blocked-times.routes.js';
import { db } from '../../../db/index.js';
import { blockedTimes } from '../../../db/schema/blocked-times.js';
import { appointments } from '../../../db/schema/appointments.js';
import { eq, and, ne, lt, gt, sql } from 'drizzle-orm';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { from, to } = c.req.valid('query');

  const conditions = [eq(blockedTimes.professionalId, profileId)];
  if (from) conditions.push(sql`${blockedTimes.endAt} >= ${from}`);
  if (to) conditions.push(sql`${blockedTimes.startAt} <= ${to}`);

  const results = await db.select().from(blockedTimes)
    .where(and(...conditions))
    .orderBy(blockedTimes.startAt);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);

  // A block over a booked appointment would leave the patient booked in a closed slot
  const [overlapping] = await db.select({ id: appointments.id }).from(appointments)
    .where(and(
      eq(appointments.professionalId, profileId),
      ne(appointments.status, 'cancelled'),
      lt(appointments.startAt, endAt),
      gt(appointments.endAt, startAt),
    ))
    .limit(1);
  if (overlapping) throw new AppError(409, 'The blocked time overlaps an appointment');

  const [created] = await db.insert(blockedTimes).values({
    professionalId: profileId,
    startAt,
    endAt,
  }).returning();

  return c.json(created, HttpStatusCodes.CREATED);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [deleted] = await db.delete(blockedTimes)
    .where(and(eq(blockedTimes.id, id), eq(blockedTimes.professionalId, profileId)))
    .returning();

  if (!deleted) throw new AppError(404, 'Blocked time not found');
  return c.json({ message: 'Blocked time removed' }, HttpStatusCodes.OK);
};
