import type { AppRouteHandler } from '../../lib/types.js';
import type {
  GetMeRoute,
  UpdateMeRoute,
  GetMyAppointmentsRoute,
  GetMyBillingDataRoute,
  UpsertMyBillingDataRoute,
} from './patient-profile.routes.js';
import { db } from '../../db/index.js';
import { patients } from '../../db/schema/patients.js';
import { appointments } from '../../db/schema/appointments.js';
import { patientBillingData } from '../../db/schema/patient-billing-data.js';
import { eq } from 'drizzle-orm';
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
