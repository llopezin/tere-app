import type { AppRouteHandler } from '../../lib/types.js';
import type {
  ListRoute,
  CreateRoute,
  GetOneRoute,
  UpdateRoute,
  GetAppointmentsRoute,
  GetBonosRoute,
  GetPaymentsRoute,
  GetBillingDataRoute,
  UpsertBillingDataRoute,
  GetRgpdConsentRoute,
  SubmitRgpdConsentRoute,
  GetContactLinkRoute,
  AssignConsentRoute,
  GetConsentsRoute,
} from './patients.routes.js';
import { db } from '../../db/index.js';
import { patients } from '../../db/schema/patients.js';
import { appointments } from '../../db/schema/appointments.js';
import { bonos } from '../../db/schema/bonos.js';
import { payments } from '../../db/schema/payments.js';
import { patientBillingData } from '../../db/schema/patient-billing-data.js';
import { rgpdConsents } from '../../db/schema/rgpd-consents.js';
import { consentDocuments } from '../../db/schema/consent-documents.js';
import { patientConsents } from '../../db/schema/patient-consents.js';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page, search } = c.req.valid('query');
  const offset = (page - 1) * per_page;

  const conditions = eq(patients.professionalId, profileId);

  if (search) {
    const searchCondition = or(
      ilike(patients.firstName, `%${search}%`),
      ilike(patients.lastName, `%${search}%`),
      ilike(patients.nie, `%${search}%`),
    );
    const results = await db.select().from(patients)
      .where(and(conditions, searchCondition))
      .limit(per_page).offset(offset);
    return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
  }

  const results = await db.select().from(patients)
    .where(conditions)
    .limit(per_page).offset(offset);
  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [patient] = await db.insert(patients).values({
    ...body,
    professionalId: profileId,
  }).returning();

  // Auto-create RGPD consent record (unsigned)
  await db.insert(rgpdConsents).values({ patientId: patient.id });

  return c.json(patient, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [patient] = await db.select().from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');
  return c.json(patient, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const [updated] = await db.update(patients)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)))
    .returning();
  if (!updated) throw new AppError(404, 'Patient not found');
  return c.json(updated, HttpStatusCodes.OK);
};

export const getAppointments: AppRouteHandler<GetAppointmentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const { page, per_page, status, from, to } = c.req.valid('query');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const conditions = [eq(appointments.patientId, id)];
  if (status) conditions.push(eq(appointments.status, status));
  if (from) conditions.push(sql`${appointments.startAt} >= ${from}`);
  if (to) conditions.push(sql`${appointments.startAt} <= ${to}`);

  const results = await db.select().from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.startAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const getBonos: AppRouteHandler<GetBonosRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const { status } = c.req.valid('query');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const conditions = [eq(bonos.patientId, id)];
  if (status) conditions.push(eq(bonos.status, status));

  const results = await db.select().from(bonos).where(and(...conditions));
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const getPayments: AppRouteHandler<GetPaymentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const results = await db.select().from(payments)
    .where(eq(payments.patientId, id))
    .orderBy(payments.paidAt);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const getBillingData: AppRouteHandler<GetBillingDataRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const [billing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, id));
  return c.json(billing || null, HttpStatusCodes.OK);
};

export const upsertBillingData: AppRouteHandler<UpsertBillingDataRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const [existing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, id));
  if (existing) {
    const [updated] = await db.update(patientBillingData)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(patientBillingData.patientId, id))
      .returning();
    return c.json(updated, HttpStatusCodes.OK);
  } else {
    const [created] = await db.insert(patientBillingData)
      .values({ ...body, patientId: id })
      .returning();
    return c.json(created, HttpStatusCodes.CREATED);
  }
};

export const getRgpdConsent: AppRouteHandler<GetRgpdConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const [consent] = await db.select().from(rgpdConsents)
    .where(eq(rgpdConsents.patientId, id));
  return c.json(consent || { signed: false as const }, HttpStatusCodes.OK);
};

export const submitRgpdConsent: AppRouteHandler<SubmitRgpdConsentRoute> = async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  const [existing] = await db.select().from(rgpdConsents)
    .where(eq(rgpdConsents.patientId, id));
  if (existing) {
    const [updated] = await db.update(rgpdConsents)
      .set({
        signed: true,
        signatureData: body.signatureData,
        signedAt: new Date(),
        ipAddress: ip,
      })
      .where(eq(rgpdConsents.patientId, id))
      .returning();
    return c.json(updated, HttpStatusCodes.OK);
  } else {
    const [created] = await db.insert(rgpdConsents)
      .values({
        patientId: id,
        signed: true,
        signatureData: body.signatureData,
        signedAt: new Date(),
        ipAddress: ip,
      })
      .returning();
    return c.json(created, HttpStatusCodes.CREATED);
  }
};

export const getContactLink: AppRouteHandler<GetContactLinkRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const [patient] = await db.select().from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const method = patient.contactMethod ?? 'whatsapp';

  let link: string;
  switch (method) {
    case 'whatsapp':
      link = `https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`;
      break;
    case 'sms':
      link = `sms:${patient.phone}`;
      break;
    case 'email':
      link = `mailto:${patient.email || ''}`;
      break;
    default:
      link = `https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`;
  }

  return c.json({ method, link }, HttpStatusCodes.OK);
};

export const assignConsent: AppRouteHandler<AssignConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  // Verify patient belongs to professional
  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  // Verify consent document belongs to professional
  const [doc] = await db.select({ id: consentDocuments.id }).from(consentDocuments)
    .where(and(eq(consentDocuments.id, body.consentDocumentId), eq(consentDocuments.professionalId, profileId)));
  if (!doc) throw new AppError(404, 'Consent document not found');

  // Check if already assigned
  const [existing] = await db.select({ id: patientConsents.id }).from(patientConsents)
    .where(and(
      eq(patientConsents.consentDocumentId, body.consentDocumentId),
      eq(patientConsents.patientId, id),
    ));
  if (existing) throw new AppError(409, 'Document already assigned to this patient');

  const [consent] = await db.insert(patientConsents).values({
    consentDocumentId: body.consentDocumentId,
    patientId: id,
    professionalId: profileId,
  }).returning();

  return c.json(consent, HttpStatusCodes.CREATED);
};

export const getConsents: AppRouteHandler<GetConsentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const { status } = c.req.valid('query');

  // Verify patient belongs to professional
  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const conditions = [eq(patientConsents.patientId, id)];
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

