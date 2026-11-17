import type { AppRouteHandler } from '../../../lib/types.js';
import type {
  PatientsListRoute,
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
import { patients, patientFullName } from '../../../db/schema/patients.js';
import { appointments } from '../../../db/schema/appointments.js';
import { bonos } from '../../../db/schema/bonos.js';
import { payments } from '../../../db/schema/payments.js';
import { patientBillingData } from '../../../db/schema/patient-billing-data.js';
import { rgpdConsents } from '../../../db/schema/rgpd-consents.js';
import { consentDocuments } from '../../../db/schema/consent-documents.js';
import { patientConsents } from '../../../db/schema/patient-consents.js';
import { eq, and, ilike, or, sql, count, getTableColumns } from 'drizzle-orm';
import { professionalPatients } from '../../../db/schema/professional-patients.js';
import { assertPatientOfProfessional, assertConsentDocumentOf } from '../../../services/ownership.service.js';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

/** Patient row as seen by a professional: shared personal data + this professional's clinical notes. */
const patientForProfessional = {
  ...getTableColumns(patients),
  clinicalNotes: professionalPatients.clinicalNotes,
};

/** Join condition that limits `patients` to the ones linked to this professional. */
function linkedTo(professionalId: string) {
  return and(
    eq(professionalPatients.patientId, patients.id),
    eq(professionalPatients.professionalId, professionalId),
  );
}

function selectPatientsOf(professionalId: string) {
  return db.select(patientForProfessional)
    .from(patients)
    .innerJoin(professionalPatients, linkedTo(professionalId))
    .$dynamic();
}

async function getPatientOf(professionalId: string, patientId: string) {
  const [patient] = await selectPatientsOf(professionalId).where(eq(patients.id, patientId));
  if (!patient) throw new AppError(404, 'Patient not found');
  return patient;
}

/**
 * Personal data, billing data and the RGPD record are shared by every professional of a patient.
 * Once the patient has their own account, only they can change it.
 */
async function assertCanEditSharedPatientData(patientId: string) {
  const [patient] = await db.select({ authUserId: patients.authUserId }).from(patients).where(eq(patients.id, patientId));
  if (patient?.authUserId) {
    throw new AppError(403, 'This patient manages their own personal data');
  }
}

const PATIENTS_LIST_PAGE_SIZE = 10;

/** `ILIKE` pattern that matches `search` anywhere. Escapes `\`, `%` and `_`: without it, a search for `%` matches every patient. */
function toContainsPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function patientSearch(search: string | undefined) {
  if (search === undefined) return undefined;
  const pattern = toContainsPattern(search);
  return or(
    ilike(patientFullName, pattern),
    ilike(patients.email, pattern),
  );
}

/** Per patient: this professional's non-cancelled appointments, the most recent past one and the next scheduled one. */
function appointmentStatsOf(professionalId: string) {
  return db.select({
    patientId: appointments.patientId,
    appointmentsCount: sql`count(*) filter (where ${appointments.status} <> 'cancelled')`.as('appointments_count'),
    lastAppointmentAt: sql`max(${appointments.startAt}) filter (where ${appointments.status} <> 'cancelled' and ${appointments.startAt} <= now())`
      .mapWith(appointments.startAt).as('last_appointment_at'),
    nextAppointmentAt: sql`min(${appointments.startAt}) filter (where ${appointments.status} = 'scheduled' and ${appointments.startAt} > now())`
      .mapWith(appointments.startAt).as('next_appointment_at'),
  })
    .from(appointments)
    .where(eq(appointments.professionalId, professionalId))
    .groupBy(appointments.patientId)
    .as('appt_stats');
}

function activeBonoStatsOf(professionalId: string) {
  return db.select({ patientId: bonos.patientId, activeBonosCount: count().as('active_bonos_count') })
    .from(bonos)
    .where(and(eq(bonos.professionalId, professionalId), eq(bonos.status, 'active')))
    .groupBy(bonos.patientId)
    .as('bono_stats');
}

export const patientsList: AppRouteHandler<PatientsListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, search } = c.req.valid('query');
  const searchCondition = patientSearch(search);
  const apptStats = appointmentStatsOf(profileId);
  const bonoStats = activeBonoStatsOf(profileId);

  const [data, [{ total }]] = await Promise.all([
    db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      phone: patients.phone,
      contactMethod: patients.contactMethod,
      appointmentsCount: sql`coalesce(${apptStats.appointmentsCount}, 0)`.mapWith(Number),
      activeBonosCount: sql`coalesce(${bonoStats.activeBonosCount}, 0)`.mapWith(Number),
      // One RGPD record per patient, shared by all their professionals
      rgpdSigned: sql`coalesce(${rgpdConsents.signed}, false)`.mapWith(Boolean),
      nextAppointmentAt: apptStats.nextAppointmentAt,
    })
      .from(patients)
      .innerJoin(professionalPatients, linkedTo(profileId))
      .leftJoin(apptStats, eq(apptStats.patientId, patients.id))
      .leftJoin(bonoStats, eq(bonoStats.patientId, patients.id))
      .leftJoin(rgpdConsents, eq(rgpdConsents.patientId, patients.id))
      .where(searchCondition)
      .orderBy(sql`${apptStats.lastAppointmentAt} desc nulls last`, patients.lastName, patients.firstName, patients.id)
      .limit(PATIENTS_LIST_PAGE_SIZE)
      .offset((page - 1) * PATIENTS_LIST_PAGE_SIZE),
    db.select({ total: count() })
      .from(patients)
      .innerJoin(professionalPatients, linkedTo(profileId))
      .where(searchCondition),
  ]);

  return c.json({ data, total, page, per_page: PATIENTS_LIST_PAGE_SIZE }, HttpStatusCodes.OK);
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
    await assertCanEditSharedPatientData(id);
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
  await assertCanEditSharedPatientData(id);

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
  await assertCanEditSharedPatientData(id);
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
  const linkByMethod: Record<typeof method, string> = {
    whatsapp: `https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`,
    sms: `sms:${patient.phone}`,
    email: `mailto:${patient.email ?? ''}`,
  };

  return c.json({ method, link: linkByMethod[method] }, HttpStatusCodes.OK);
};

export const assignConsent: AppRouteHandler<AssignConsentRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  await assertPatientOfProfessional(profileId, id);
  await assertConsentDocumentOf(profileId, body.consentDocumentId);

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
    ...getTableColumns(patientConsents),
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

