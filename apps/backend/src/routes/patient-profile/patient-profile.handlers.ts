import type { AppRouteHandler } from '../../lib/types.js';
import type {
  GetMeRoute,
  UpdateMeRoute,
  GetMyAppointmentsRoute,
  GetMyBillingDataRoute,
  UpsertMyBillingDataRoute,
  GetMyConsentsRoute,
  GetMyConsentRoute,
  SignMyConsentRoute,
  AcceptMyRgpdConsentRoute,
} from './patient-profile.routes.js';
import { db } from '../../db/index.js';
import { patients } from '../../db/schema/patients.js';
import { appointments } from '../../db/schema/appointments.js';
import { patientBillingData } from '../../db/schema/patient-billing-data.js';
import { patientConsents } from '../../db/schema/patient-consents.js';
import { consentDocuments } from '../../db/schema/consent-documents.js';
import { rgpdConsents } from '../../db/schema/rgpd-consents.js';
import { eq, and } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const getMe: AppRouteHandler<GetMeRoute> = async (c) => {
  const profileId = getProfileId(c);
  const [patient] = await db.select().from(patients).where(eq(patients.id, profileId));
  if (!patient) throw new AppError(404, 'Patient profile not found');
  return c.json(patient, HttpStatusCodes.OK);
};

export const updateMe: AppRouteHandler<UpdateMeRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [updated] = await db.update(patients)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(patients.id, profileId))
    .returning();
  if (!updated) throw new AppError(404, 'Patient profile not found');
  return c.json(updated, HttpStatusCodes.OK);
};

export const getMyAppointments: AppRouteHandler<GetMyAppointmentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page } = c.req.valid('query');

  const results = await db.select().from(appointments)
    .where(eq(appointments.patientId, profileId))
    .orderBy(appointments.startAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const getMyBillingData: AppRouteHandler<GetMyBillingDataRoute> = async (c) => {
  const profileId = getProfileId(c);
  const [billing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, profileId));
  return c.json(billing || null, HttpStatusCodes.OK);
};

export const upsertMyBillingData: AppRouteHandler<UpsertMyBillingDataRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [existing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, profileId));

  if (existing) {
    const [updated] = await db.update(patientBillingData)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(patientBillingData.patientId, profileId))
      .returning();
    return c.json(updated, HttpStatusCodes.OK);
  } else {
    const [created] = await db.insert(patientBillingData)
      .values({ ...body, patientId: profileId })
      .returning();
    return c.json(created, HttpStatusCodes.CREATED);
  }
};

export const getMyConsents: AppRouteHandler<GetMyConsentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { status } = c.req.valid('query');

  const conditions = [eq(patientConsents.patientId, profileId)];
  if (status) conditions.push(eq(patientConsents.status, status));

  const results = await db.select({
    id: patientConsents.id,
    consentDocumentId: patientConsents.consentDocumentId,
    patientId: patientConsents.patientId,
    professionalId: patientConsents.professionalId,
    status: patientConsents.status,
    signatureData: patientConsents.signatureData,
    signedAt: patientConsents.signedAt,
    ipAddress: patientConsents.ipAddress,
    createdAt: patientConsents.createdAt,
    document: {
      title: consentDocuments.title,
      description: consentDocuments.description,
    },
  })
    .from(patientConsents)
    .innerJoin(consentDocuments, eq(patientConsents.consentDocumentId, consentDocuments.id))
    .where(and(...conditions))
    .orderBy(patientConsents.createdAt);

  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const getMyConsent: AppRouteHandler<GetMyConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { consentId } = c.req.valid('param');

  const [result] = await db.select({
    id: patientConsents.id,
    consentDocumentId: patientConsents.consentDocumentId,
    patientId: patientConsents.patientId,
    professionalId: patientConsents.professionalId,
    status: patientConsents.status,
    signatureData: patientConsents.signatureData,
    signedAt: patientConsents.signedAt,
    ipAddress: patientConsents.ipAddress,
    createdAt: patientConsents.createdAt,
    document: {
      title: consentDocuments.title,
      description: consentDocuments.description,
      content: consentDocuments.content,
    },
  })
    .from(patientConsents)
    .innerJoin(consentDocuments, eq(patientConsents.consentDocumentId, consentDocuments.id))
    .where(and(eq(patientConsents.id, consentId), eq(patientConsents.patientId, profileId)));

  if (!result) throw new AppError(404, 'Consent not found');
  return c.json(result, HttpStatusCodes.OK);
};

export const signMyConsent: AppRouteHandler<SignMyConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { consentId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [consent] = await db.select().from(patientConsents)
    .where(and(eq(patientConsents.id, consentId), eq(patientConsents.patientId, profileId)));
  if (!consent) throw new AppError(404, 'Consent not found');
  if (consent.status === 'signed') throw new AppError(400, 'Consent already signed');

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  const [updated] = await db.update(patientConsents)
    .set({
      status: 'signed',
      signatureData: body.signatureData,
      signedAt: new Date(),
      ipAddress: ip,
    })
    .where(eq(patientConsents.id, consentId))
    .returning();

  return c.json(updated, HttpStatusCodes.OK);
};

export const acceptMyRgpdConsent: AppRouteHandler<AcceptMyRgpdConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';

  const [existing] = await db.select().from(rgpdConsents)
    .where(eq(rgpdConsents.patientId, profileId));

  const now = new Date();

  if (existing) {
    const [updated] = await db.update(rgpdConsents)
      .set({ signed: true, signatureData: 'web_checkbox', signedAt: now, ipAddress: ip })
      .where(eq(rgpdConsents.patientId, profileId))
      .returning();
    return c.json(updated, HttpStatusCodes.OK);
  }

  const [created] = await db.insert(rgpdConsents)
    .values({ patientId: profileId, signed: true, signatureData: 'web_checkbox', signedAt: now, ipAddress: ip })
    .returning();
  return c.json(created, HttpStatusCodes.OK);
};
