import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, CreateRoute, RemoveRoute } from './blocked-times.routes.js';
import { db } from '../../db/index.js';
import { blockedTimes } from '../../db/schema/blocked-times.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
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

  const [created] = await db.insert(blockedTimes).values({
    professionalId: profileId,
    startAt: new Date(body.startAt),
    endAt: new Date(body.endAt),
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
