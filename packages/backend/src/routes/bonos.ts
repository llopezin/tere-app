import { Hono } from 'hono';
import { db } from '../db/index.js';
import { bonos } from '../db/schema/bonos.js';
import { bonoTransactions } from '../db/schema/bono-transactions.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createBonoSchema, deductBonoSchema, paginationSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const bonoRoutes = new Hono();

bonoRoutes.use('*', authMiddleware);

// GET /bonos
bonoRoutes.get('/', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const patientId = c.req.query('patient_id');
  const status = c.req.query('status');

  const conditions = [eq(bonos.professionalId, profileId)];
  if (patientId) conditions.push(eq(bonos.patientId, patientId));
  if (status) conditions.push(eq(bonos.status, status as any));

  const results = await db.select().from(bonos).where(and(...conditions));
  return c.json({ data: results });
});

// POST /bonos
bonoRoutes.post('/', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const body = createBonoSchema.parse(await c.req.json());

  const [created] = await db.insert(bonos).values({
    professionalId: profileId,
    patientId: body.patientId,
    appointmentTypeId: body.appointmentTypeId,
    name: body.name,
    price: body.price.toFixed(2),
    totalSessions: body.totalSessions,
  }).returning();

  return c.json(created, 201);
});

// GET /bonos/:id
bonoRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const conditions = [eq(bonos.id, id)];
  if (user.role === 'professional') {
    conditions.push(eq(bonos.professionalId, profileId));
  } else {
    conditions.push(eq(bonos.patientId, profileId));
  }

  const [bono] = await db.select().from(bonos).where(and(...conditions));
  if (!bono) throw new AppError(404, 'Bono not found');

  return c.json({
    ...bono,
    sessions_remaining: bono.totalSessions - bono.sessionsUsed,
  });
});

// GET /bonos/:id/transactions
bonoRoutes.get('/:id/transactions', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  // Verify bono belongs to professional
  const [bono] = await db.select().from(bonos)
    .where(and(eq(bonos.id, id), eq(bonos.professionalId, profileId)));
  if (!bono) throw new AppError(404, 'Bono not found');

  const results = await db.select().from(bonoTransactions)
    .where(eq(bonoTransactions.bonoId, id))
    .orderBy(bonoTransactions.createdAt);

  return c.json({ data: results });
});

// POST /bonos/:id/deduct — manual deduction
bonoRoutes.post('/:id/deduct', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const body = deductBonoSchema.parse(await c.req.json());

  const result = await db.transaction(async (tx) => {
    const [bono] = await tx.select().from(bonos)
      .where(and(eq(bonos.id, id), eq(bonos.professionalId, profileId)));
    if (!bono) throw new AppError(404, 'Bono not found');
    if (bono.status === 'exhausted') throw new AppError(400, 'Bono is exhausted');
    if (bono.sessionsUsed >= bono.totalSessions) throw new AppError(400, 'No remaining sessions');

    const newUsed = bono.sessionsUsed + 1;
    const [updated] = await tx.update(bonos).set({
      sessionsUsed: newUsed,
      status: newUsed >= bono.totalSessions ? 'exhausted' : 'active',
      updatedAt: new Date(),
    }).where(eq(bonos.id, id)).returning();

    await tx.insert(bonoTransactions).values({
      bonoId: id,
      type: 'manual_deduction',
    });

    // TODO: Send notification to patient via preferred contact_method
    return updated;
  });

  return c.json(result);
});

export default bonoRoutes;
