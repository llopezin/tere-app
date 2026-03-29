import { Hono } from 'hono';
import { db } from '../db/index.js';
import { payments } from '../db/schema/payments.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createPaymentSchema, paginationSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const paymentRoutes = new Hono();

paymentRoutes.use('*', authMiddleware, requireRole('professional'));

// GET /payments
paymentRoutes.get('/', async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page } = paginationSchema.parse(c.req.query());
  const from = c.req.query('from');
  const to = c.req.query('to');
  const patientId = c.req.query('patient_id');
  const paymentMethod = c.req.query('payment_method');

  const conditions = [eq(payments.professionalId, profileId)];
  if (from) conditions.push(sql`${payments.paidAt} >= ${from}`);
  if (to) conditions.push(sql`${payments.paidAt} <= ${to}`);
  if (patientId) conditions.push(eq(payments.patientId, patientId));
  if (paymentMethod) conditions.push(eq(payments.paymentMethod, paymentMethod as any));

  const results = await db.select().from(payments)
    .where(and(...conditions))
    .orderBy(payments.paidAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page });
});

// POST /payments
paymentRoutes.post('/', async (c) => {
  const profileId = getProfileId(c);
  const body = createPaymentSchema.parse(await c.req.json());

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

  return c.json(created, 201);
});

// GET /payments/:id
paymentRoutes.get('/:id', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [payment] = await db.select().from(payments)
    .where(and(eq(payments.id, id), eq(payments.professionalId, profileId)));
  if (!payment) throw new AppError(404, 'Payment not found');
  return c.json(payment);
});

export default paymentRoutes;
