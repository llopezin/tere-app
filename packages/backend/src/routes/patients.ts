import { Hono } from 'hono';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';
import { appointments } from '../db/schema/appointments.js';
import { bonos } from '../db/schema/bonos.js';
import { payments } from '../db/schema/payments.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createPatientSchema, updatePatientSchema, upsertBillingDataSchema, submitConsentSchema, paginationSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const patientRoutes = new Hono();

patientRoutes.use('*', authMiddleware, requireRole('professional'));

// GET /patients — list with optional search
patientRoutes.get('/', async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page } = paginationSchema.parse(c.req.query());
  const search = c.req.query('search');

  const offset = (page - 1) * per_page;
  let conditions = eq(patients.professionalId, profileId);

  if (search) {
    const searchCondition = or(
      ilike(patients.firstName, `%${search}%`),
      ilike(patients.lastName, `%${search}%`),
      ilike(patients.nie, `%${search}%`)
    );
    const results = await db.select().from(patients)
      .where(and(conditions, searchCondition))
      .limit(per_page).offset(offset);
    return c.json({ data: results, page, per_page });
  }

  const results = await db.select().from(patients)
    .where(conditions)
    .limit(per_page).offset(offset);
  return c.json({ data: results, page, per_page });
});

// POST /patients — create
patientRoutes.post('/', async (c) => {
  const profileId = getProfileId(c);
  const body = createPatientSchema.parse(await c.req.json());

  const [patient] = await db.insert(patients).values({
    ...body,
    professionalId: profileId,
  }).returning();

  // Auto-create RGPD consent record (unsigned)
  await db.insert(rgpdConsents).values({ patientId: patient.id });

  return c.json(patient, 201);
});

// GET /patients/:id
patientRoutes.get('/:id', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [patient] = await db.select().from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');
  return c.json(patient);
});

// PUT /patients/:id
patientRoutes.put('/:id', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const body = updatePatientSchema.parse(await c.req.json());

  const [updated] = await db.update(patients)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)))
    .returning();
  if (!updated) throw new AppError(404, 'Patient not found');
  return c.json(updated);
});

// GET /patients/:id/appointments
patientRoutes.get('/:id/appointments', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const { page, per_page } = paginationSchema.parse(c.req.query());
  const status = c.req.query('status');
  const from = c.req.query('from');
  const to = c.req.query('to');

  // Verify patient belongs to professional
  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const conditions = [eq(appointments.patientId, id)];
  if (status) conditions.push(eq(appointments.status, status as any));
  if (from) conditions.push(sql`${appointments.startAt} >= ${from}`);
  if (to) conditions.push(sql`${appointments.startAt} <= ${to}`);

  const results = await db.select().from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.startAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page });
});

// GET /patients/:id/bonos
patientRoutes.get('/:id/bonos', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const statusFilter = c.req.query('status');

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const conditions = [eq(bonos.patientId, id)];
  if (statusFilter) conditions.push(eq(bonos.status, statusFilter as any));

  const results = await db.select().from(bonos).where(and(...conditions));
  return c.json({ data: results });
});

// GET /patients/:id/payments
patientRoutes.get('/:id/payments', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const results = await db.select().from(payments)
    .where(eq(payments.patientId, id))
    .orderBy(payments.paidAt);
  return c.json({ data: results });
});

// --- Billing Data ---
// GET /patients/:id/billing-data
patientRoutes.get('/:id/billing-data', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const [billing] = await db.select().from(patientBillingData).where(eq(patientBillingData.patientId, id));
  return c.json(billing || null);
});

// PUT /patients/:id/billing-data
patientRoutes.put('/:id/billing-data', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const body = upsertBillingDataSchema.parse(await c.req.json());

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  // Upsert
  const [existing] = await db.select().from(patientBillingData).where(eq(patientBillingData.patientId, id));
  if (existing) {
    const [updated] = await db.update(patientBillingData)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(patientBillingData.patientId, id))
      .returning();
    return c.json(updated);
  } else {
    const [created] = await db.insert(patientBillingData)
      .values({ ...body, patientId: id })
      .returning();
    return c.json(created, 201);
  }
});

// --- RGPD Consent ---
// GET /patients/:id/rgpd-consent
patientRoutes.get('/:id/rgpd-consent', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  const [consent] = await db.select().from(rgpdConsents).where(eq(rgpdConsents.patientId, id));
  return c.json(consent || { signed: false });
});

// POST /patients/:id/rgpd-consent
patientRoutes.post('/:id/rgpd-consent', async (c) => {
  const { id } = c.req.param();
  const body = submitConsentSchema.parse(await c.req.json());

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  const [existing] = await db.select().from(rgpdConsents).where(eq(rgpdConsents.patientId, id));
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
    return c.json(updated);
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
    return c.json(created, 201);
  }
});

// --- Contact Link ---
// GET /patients/:id/contact-link
patientRoutes.get('/:id/contact-link', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [patient] = await db.select().from(patients)
    .where(and(eq(patients.id, id), eq(patients.professionalId, profileId)));
  if (!patient) throw new AppError(404, 'Patient not found');

  let link: string;
  switch (patient.contactMethod) {
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

  return c.json({ method: patient.contactMethod, link });
});

export default patientRoutes;
