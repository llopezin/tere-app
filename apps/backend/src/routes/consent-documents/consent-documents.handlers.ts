import type { AppRouteHandler } from '../../lib/types.js';
import type {
  ListRoute,
  CreateRoute,
  GetOneRoute,
  UpdateRoute,
  RemoveRoute,
} from './consent-documents.routes.js';
import { db } from '../../db/index.js';
import { consentDocuments } from '../../db/schema/consent-documents.js';
import { patientConsents } from '../../db/schema/patient-consents.js';
import { eq, and } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const results = await db.select().from(consentDocuments)
    .where(eq(consentDocuments.professionalId, profileId))
    .orderBy(consentDocuments.createdAt);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [doc] = await db.insert(consentDocuments).values({
    ...body,
    professionalId: profileId,
  }).returning();

  return c.json(doc, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [doc] = await db.select().from(consentDocuments)
    .where(and(eq(consentDocuments.id, id), eq(consentDocuments.professionalId, profileId)));
  if (!doc) throw new AppError(404, 'Consent document not found');
  return c.json(doc, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const [updated] = await db.update(consentDocuments)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(consentDocuments.id, id), eq(consentDocuments.professionalId, profileId)))
    .returning();
  if (!updated) throw new AppError(404, 'Consent document not found');
  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [doc] = await db.select({ id: consentDocuments.id }).from(consentDocuments)
    .where(and(eq(consentDocuments.id, id), eq(consentDocuments.professionalId, profileId)));
  if (!doc) throw new AppError(404, 'Consent document not found');

  // Check if any patient consents reference this document
  const [assignment] = await db.select({ id: patientConsents.id }).from(patientConsents)
    .where(eq(patientConsents.consentDocumentId, id))
    .limit(1);
  if (assignment) throw new AppError(409, 'Cannot delete: document is assigned to patients');

  await db.delete(consentDocuments).where(eq(consentDocuments.id, id));
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
