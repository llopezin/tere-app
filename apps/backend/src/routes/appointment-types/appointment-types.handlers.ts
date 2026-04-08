import type { AppRouteHandler } from '../../lib/types.js';
import type { ListRoute, CreateRoute, UpdateRoute, RemoveRoute } from './appointment-types.routes.js';
import { db } from '../../db/index.js';
import { appointmentTypes } from '../../db/schema/appointment-types.js';
import { eq, and } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const user = c.get('user');

  if (user.role === 'professional') {
    const profileId = getProfileId(c);
    const results = await db.select().from(appointmentTypes)
      .where(eq(appointmentTypes.professionalId, profileId));
    return c.json({ data: results }, HttpStatusCodes.OK);
  }

  const { professional_id: professionalId } = c.req.valid('query');
  if (!professionalId) throw new AppError(400, 'professional_id query param required');

  const results = await db.select().from(appointmentTypes)
    .where(and(
      eq(appointmentTypes.professionalId, professionalId),
      eq(appointmentTypes.isActive, true),
    ));
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [created] = await db.insert(appointmentTypes).values({
    ...body,
    price: body.price.toFixed(2),
    professionalId: profileId,
  }).returning();

  return c.json(created, HttpStatusCodes.CREATED);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const updateData: Record<string, any> = { ...body, updatedAt: new Date() };
  if (body.price !== undefined) updateData.price = body.price.toFixed(2);

  const [updated] = await db.update(appointmentTypes)
    .set(updateData)
    .where(and(eq(appointmentTypes.id, id), eq(appointmentTypes.professionalId, profileId)))
    .returning();

  if (!updated) throw new AppError(404, 'Appointment type not found');
  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [updated] = await db.update(appointmentTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(appointmentTypes.id, id), eq(appointmentTypes.professionalId, profileId)))
    .returning();

  if (!updated) throw new AppError(404, 'Appointment type not found');
  return c.json({ message: 'Appointment type deactivated' }, HttpStatusCodes.OK);
};
