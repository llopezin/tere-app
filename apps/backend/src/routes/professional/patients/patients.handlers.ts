import type { AppRouteHandler } from '../../../lib/types.js';
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
import { db } from '../../../db/index.js';
import { patients } from '../../../db/schema/patients.js';
import { appointments } from '../../../db/schema/appointments.js';
import { bonos } from '../../../db/schema/bonos.js';
import { payments } from '../../../db/schema/payments.js';
import { patientBillingData } from '../../../db/schema/patient-billing-data.js';
import { rgpdConsents } from '../../../db/schema/rgpd-consents.js';
import { consentDocuments } from '../../../db/schema/consent-documents.js';
import { patientConsents } from '../../../db/schema/patient-consents.js';
import { eq, and, ilike, or, sql, getTableColumns } from 'drizzle-orm';
import { professionalPatients } from '../../../db/schema/professional-patients.js';
import { assertPatientOfProfessional, assertConsentDocumentOf } from '../../../services/ownership.service.js';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

const { professionalId: _professionalId, clinicalNotes: _clinicalNotes, ...patientColumns } = getTableColumns(patients);

/** Patient row as seen by a professional: shared personal data + this professional's clinical notes. */
const patientForProfessional = {
  ...patientColumns,
  clinicalNotes: professionalPatients.clinicalNotes,
};

function selectPatientsOf(professionalId: string) {
  return db.select(patientForProfessional)
    .from(patients)
    .innerJoin(professionalPatients, and(
      eq(professionalPatients.patientId, patients.id),
      eq(professionalPatients.professionalId, professionalId),
    ))
    .$dynamic();
}

async function getPatientOf(professionalId: string, patientId: string) {
  const [patient] = await selectPatientsOf(professionalId).where(eq(patients.id, patientId));
  if (!patient) throw new AppError(404, 'Patient not found');
  return patient;
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page, search } = c.req.valid('query');
  const offset = (page - 1) * per_page;

  const searchCondition = search
    ? or(
      ilike(patients.firstName, `%${search}%`),
      ilike(patients.lastName, `%${search}%`),
      ilike(patients.nie, `%${search}%`),
    )
    : undefined;

  const results = await selectPatientsOf(profileId)
    .where(searchCondition)
    .orderBy(patients.lastName, patients.firstName)
    .limit(per_page).offset(offset);
  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { clinicalNotes, ...personalData } = c.req.valid('json');

  const patientId = await db.transaction(async (tx) => {
    const [patient] = await tx.insert(patients).values(personalData).returning({ id: patients.id });
    await tx.insert(professionalPatients).values({ professionalId: profileId, patientId: patient.id, clinicalNotes });
    // Auto-create RGPD consent record (unsigned)
    await tx.insert(rgpdConsents).values({ patientId: patient.id });
    return patient.id;
  });

  return c.json(await getPatientOf(profileId, patientId), HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  return c.json(await getPatientOf(profileId, id), HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const { clinicalNotes, ...personalData } = c.req.valid('json');

  await assertPatientOfProfessional(profileId, id);

  const hasPersonalChanges = Object.values(personalData).some((v) => v !== undefined);
  if (hasPersonalChanges) {
    // Personal data is shared between professionals. Once the patient has an account, only they can change it.
    const [patient] = await db.select({ authUserId: patients.authUserId }).from(patients).where(eq(patients.id, id));
    if (patient?.authUserId) {
      throw new AppError(403, 'This patient manages their own personal data');
    }
    await db.update(patients).set({ ...personalData, updatedAt: new Date() }).where(eq(patients.id, id));
  }

  if (clinicalNotes !== undefined) {
    await db.update(professionalPatients)
      .set({ clinicalNotes, updatedAt: new Date() })
      .where(and(eq(professionalPatients.professionalId, profileId), eq(professionalPatients.patientId, id)));
  }

  return c.json(await getPatientOf(profileId, id), HttpStatusCodes.OK);
};

export const getAppointments: AppRouteHandler<GetAppointmentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const { page, per_page, status, from, to } = c.req.valid('query');

  await assertPatientOfProfessional(profileId, id);

  const conditions = [eq(appointments.patientId, id), eq(appointments.professionalId, profileId)];
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

  await assertPatientOfProfessional(profileId, id);

  const conditions = [eq(bonos.patientId, id), eq(bonos.professionalId, profileId)];
  if (status) conditions.push(eq(bonos.status, status));

  const results = await db.select().from(bonos).where(and(...conditions));
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const getPayments: AppRouteHandler<GetPaymentsRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  await assertPatientOfProfessional(profileId, id);

  const results = await db.select().from(payments)
    .where(and(eq(payments.patientId, id), eq(payments.professionalId, profileId)))
    .orderBy(payments.paidAt);
  return c.json({ data: results }, HttpStatusCodes.OK);
};

export const getBillingData: AppRouteHandler<GetBillingDataRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  await assertPatientOfProfessional(profileId, id);

  const [billing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, id));
  return c.json(billing || null, HttpStatusCodes.OK);
};

export const upsertBillingData: AppRouteHandler<UpsertBillingDataRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  await assertPatientOfProfessional(profileId, id);

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

  await assertPatientOfProfessional(profileId, id);

  const [consent] = await db.select().from(rgpdConsents)
    .where(eq(rgpdConsents.patientId, id));
  return c.json(consent || { signed: false as const }, HttpStatusCodes.OK);
};

export const submitRgpdConsent: AppRouteHandler<SubmitRgpdConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  await assertPatientOfProfessional(profileId, id);
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

  const patient = await getPatientOf(profileId, id);

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

  await assertPatientOfProfessional(profileId, id);

  await assertConsentDocumentOf(profileId, body.consentDocumentId);

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

  await assertPatientOfProfessional(profileId, id);

  const conditions = [eq(patientConsents.patientId, id), eq(patientConsents.professionalId, profileId)];
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

