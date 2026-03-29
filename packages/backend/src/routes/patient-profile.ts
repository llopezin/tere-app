import { Hono } from 'hono';
import { db } from '../db/index.js';
import { patients } from '../db/schema/patients.js';
import { appointments } from '../db/schema/appointments.js';
import { patientBillingData } from '../db/schema/patient-billing-data.js';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { updatePatientSchema, upsertBillingDataSchema, paginationSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const patientProfile = new Hono();

patientProfile.use('*', authMiddleware, requireRole('patient'));

// GET /patient/me
patientProfile.get('/me', async (c) => {
  const profileId = getProfileId(c);
  const [patient] = await db.select().from(patients).where(eq(patients.id, profileId));
  if (!patient) throw new AppError(404, 'Patient profile not found');
  return c.json(patient);
});

// PUT /patient/me
patientProfile.put('/me', async (c) => {
  const profileId = getProfileId(c);
  const body = updatePatientSchema.parse(await c.req.json());

  const [updated] = await db.update(patients)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(patients.id, profileId))
    .returning();
  if (!updated) throw new AppError(404, 'Patient profile not found');
  return c.json(updated);
});

// GET /patient/me/appointments
patientProfile.get('/me/appointments', async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page } = paginationSchema.parse(c.req.query());

  const results = await db.select().from(appointments)
    .where(eq(appointments.patientId, profileId))
    .orderBy(appointments.startAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page });
});

// GET /patient/me/billing-data
patientProfile.get('/me/billing-data', async (c) => {
  const profileId = getProfileId(c);
  const [billing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, profileId));
  return c.json(billing || null);
});

// PUT /patient/me/billing-data
patientProfile.put('/me/billing-data', async (c) => {
  const profileId = getProfileId(c);
  const body = upsertBillingDataSchema.parse(await c.req.json());

  const [existing] = await db.select().from(patientBillingData)
    .where(eq(patientBillingData.patientId, profileId));

  if (existing) {
    const [updated] = await db.update(patientBillingData)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(patientBillingData.patientId, profileId))
      .returning();
    return c.json(updated);
  } else {
    const [created] = await db.insert(patientBillingData)
      .values({ ...body, patientId: profileId })
      .returning();
    return c.json(created, 201);
  }
});

export default patientProfile;
