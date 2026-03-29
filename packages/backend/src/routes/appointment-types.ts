import { Hono } from 'hono';
import { db } from '../db/index.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createAppointmentTypeSchema, updateAppointmentTypeSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const appointmentTypeRoutes = new Hono();

appointmentTypeRoutes.use('*', authMiddleware);

// GET /appointment-types — professional sees own, patient sees all active for booking
appointmentTypeRoutes.get('/', async (c) => {
  const user = c.get('user');

  if (user.role === 'professional') {
    const profileId = getProfileId(c);
    const results = await db.select().from(appointmentTypes)
      .where(eq(appointmentTypes.professionalId, profileId));
    return c.json({ data: results });
  } else {
    // Patient: we need a professional_id query param to see their types
    const professionalId = c.req.query('professional_id');
    if (!professionalId) throw new AppError(400, 'professional_id query param required');

    const results = await db.select().from(appointmentTypes)
      .where(and(
        eq(appointmentTypes.professionalId, professionalId),
        eq(appointmentTypes.isActive, true)
      ));
    return c.json({ data: results });
  }
});

// POST /appointment-types
appointmentTypeRoutes.post('/', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const body = createAppointmentTypeSchema.parse(await c.req.json());

  const [created] = await db.insert(appointmentTypes).values({
    ...body,
    price: body.price.toFixed(2),
    professionalId: profileId,
  }).returning();

  return c.json(created, 201);
});

// PUT /appointment-types/:id
appointmentTypeRoutes.put('/:id', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const body = updateAppointmentTypeSchema.parse(await c.req.json());

  const updateData: Record<string, any> = { ...body, updatedAt: new Date() };
  if (body.price !== undefined) updateData.price = body.price.toFixed(2);

  const [updated] = await db.update(appointmentTypes)
    .set(updateData)
    .where(and(eq(appointmentTypes.id, id), eq(appointmentTypes.professionalId, profileId)))
    .returning();

  if (!updated) throw new AppError(404, 'Appointment type not found');
  return c.json(updated);
});

// DELETE /appointment-types/:id — soft delete
appointmentTypeRoutes.delete('/:id', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [updated] = await db.update(appointmentTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(appointmentTypes.id, id), eq(appointmentTypes.professionalId, profileId)))
    .returning();

  if (!updated) throw new AppError(404, 'Appointment type not found');
  return c.json({ message: 'Appointment type deactivated' });
});

export default appointmentTypeRoutes;
