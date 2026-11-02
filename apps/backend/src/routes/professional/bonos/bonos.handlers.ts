import type { AppRouteHandler } from '../../../lib/types.js';
import type {
  ListRoute,
  CreateRoute,
  GetOneRoute,
  ListTransactionsRoute,
  DeductRoute,
} from './bonos.routes.js';
import { db } from '../../../db/index.js';
import { bonos } from '../../../db/schema/bonos.js';
import { bonoTransactions } from '../../../db/schema/bono-transactions.js';
import { eq, and } from 'drizzle-orm';
import { getProfileId } from '../../../middleware/auth.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { assertPatientOfProfessional, assertAppointmentTypeOf, assertBonoOf } from '../../../services/ownership.service.js';
import * as appointmentService from '../../../services/appointment.service.js';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { patient_id: patientId, status } = c.req.valid('query');
  const conditions = [eq(bonos.professionalId, profileId)];
  if (patientId) {
    await assertPatientOfProfessional(profileId, patientId);
    conditions.push(eq(bonos.patientId, patientId));
  }
  if (status) conditions.push(eq(bonos.status, status));
  const results = await db.select().from(bonos).where(and(...conditions));
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  await assertPatientOfProfessional(profileId, body.patientId);
  await assertAppointmentTypeOf(profileId, body.appointmentTypeId);
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
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const bono = await assertBonoOf({ professionalId: profileId }, id);
  return c.json({ ...bono, sessions_remaining: bono.totalSessions - bono.sessionsUsed }, HttpStatusCodes.OK);
};

export const listTransactions: AppRouteHandler<ListTransactionsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  await assertBonoOf({ professionalId: profileId }, id);
  const results = await db.select().from(bonoTransactions)
    .where(eq(bonoTransactions.bonoId, id))
    .orderBy(bonoTransactions.createdAt);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const deduct: AppRouteHandler<DeductRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  await assertBonoOf({ professionalId: profileId }, id);
  const bono = await db.transaction((tx) => appointmentService.deductBonoSession(tx, id));
  return c.json(bono, HttpStatusCodes.OK);
};
