import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, GetMeRoute, UpdateMeRoute } from './professionals.routes.js';
import { db } from '../../db/index.js';
import { professionals } from '../../db/schema/professionals.js';
import { eq } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const data = await db.select().from(professionals);
  return c.json({ data }, HttpStatusCodes.OK);
};

export const getMe: AppRouteHandler<GetMeRoute> = async (c) => {
  const profileId = getProfileId(c);
  const [prof] = await db.select().from(professionals).where(eq(professionals.id, profileId));
  if (!prof) throw new AppError(404, 'Professional profile not found');
  return c.json(prof, HttpStatusCodes.OK);
};

export const updateMe: AppRouteHandler<UpdateMeRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  const [updated] = await db.update(professionals)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(professionals.id, profileId))
    .returning();
  if (!updated) throw new AppError(404, 'Professional profile not found');
  return c.json(updated, HttpStatusCodes.OK);
};
