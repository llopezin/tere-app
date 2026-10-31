import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, BulkReplaceRoute } from './working-schedules.routes.js';
import { db } from '../../db/index.js';
import { workingSchedules } from '../../db/schema/working-schedules.js';
import { eq } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const results = await db.select().from(workingSchedules)
    .where(eq(workingSchedules.professionalId, profileId))
    .orderBy(workingSchedules.dayOfWeek, workingSchedules.startTime);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const bulkReplace: AppRouteHandler<BulkReplaceRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const results = await db.transaction(async (tx) => {
    await tx.delete(workingSchedules)
      .where(eq(workingSchedules.professionalId, profileId));

    if (body.slots.length === 0) return [];

    return tx.insert(workingSchedules)
      .values(body.slots.map((slot) => ({
        professionalId: profileId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })))
      .returning();
  });

  return c.json({ data: results }, HttpStatusCodes.OK);
};
