import type { AppRouteHandler } from '../../lib/types.js';
import type {
  ListRoute,
  CreateRoute,
  GetOneRoute,
  ListTransactionsRoute,
  DeductRoute,
} from './bonos.routes.js';
import { db } from '../../db/index.js';
import { bonos } from '../../db/schema/bonos.js';
import { bonoTransactions } from '../../db/schema/bono-transactions.js';
import { eq, and } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { patient_id: patientId, status } = c.req.valid('query');
  const conditions = [eq(bonos.professionalId, profileId)];
  if (patientId) conditions.push(eq(bonos.patientId, patientId));
  if (status) conditions.push(eq(bonos.status, status as any));
  const results = await db.select().from(bonos).where(and(...conditions));
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  const [created] = await db.insert(bonos).values({
    professionalId: profileId,
    patientId: body.patientId,
    appointmentTypeId: body.appointmentTypeId,
    name: body.name,
    price: body.price.toFixed(2),
    totalSessions: body.totalSessions,
  }).returning();
  return c.json(created, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const conditions = [eq(bonos.id, id)];
  if (user.role === 'professional') conditions.push(eq(bonos.professionalId, profileId));
  else conditions.push(eq(bonos.patientId, profileId));
  const [bono] = await db.select().from(bonos).where(and(...conditions));
  if (!bono) throw new AppError(404, 'Bono not found');
  return c.json({ ...bono, sessions_remaining: bono.totalSessions - bono.sessionsUsed }, HttpStatusCodes.OK);
};

export const listTransactions: AppRouteHandler<ListTransactionsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const [bono] = await db.select().from(bonos)
    .where(and(eq(bonos.id, id), eq(bonos.professionalId, profileId)));
  if (!bono) throw new AppError(404, 'Bono not found');
  const results = await db.select().from(bonoTransactions)
    .where(eq(bonoTransactions.bonoId, id))
    .orderBy(bonoTransactions.createdAt);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const deduct: AppRouteHandler<DeductRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  c.req.valid('json');
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
    await tx.insert(bonoTransactions).values({ bonoId: id, type: 'manual_deduction' });
    return updated;
  });
  return c.json(result, HttpStatusCodes.OK);
};
