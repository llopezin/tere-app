import { Hono } from 'hono';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { updateProfessionalSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const professionalRoutes = new Hono();

professionalRoutes.use('*', authMiddleware, requireRole('professional'));

// GET /professionals/me
professionalRoutes.get('/me', async (c) => {
  const profileId = getProfileId(c);
  const [prof] = await db.select().from(professionals).where(eq(professionals.id, profileId));
  if (!prof) throw new AppError(404, 'Professional profile not found');
  return c.json(prof);
});

// PUT /professionals/me
professionalRoutes.put('/me', async (c) => {
  const profileId = getProfileId(c);
  const body = updateProfessionalSchema.parse(await c.req.json());

  const [updated] = await db.update(professionals)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(professionals.id, profileId))
    .returning();

  if (!updated) throw new AppError(404, 'Professional profile not found');
  return c.json(updated);
});

export default professionalRoutes;
