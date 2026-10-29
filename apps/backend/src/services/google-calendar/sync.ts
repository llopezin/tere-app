import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { appointments } from '../../db/schema/appointments.js';
import { appointmentTypes } from '../../db/schema/appointment-types.js';
import { patients } from '../../db/schema/patients.js';
import { professionals } from '../../db/schema/professionals.js';
import { googleCalendarIntegrations } from '../../db/schema/google-calendar-integrations.js';
import { env } from '../../config/env.js';
import { getOAuthClient, InvalidGrantError } from './oauth-client.js';
import { appointmentToGoogleEvent } from './event-mapper.js';
import { createEvent, updateEvent, deleteEvent } from './events.js';

export type SyncOp = 'create' | 'update' | 'delete';

export interface PushArgs {
  appointmentId: string;
  op: SyncOp;
}

function isEnabled(): boolean {
  return Boolean(
    env.GCAL_SYNC_ENABLED &&
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REDIRECT_URI,
  );
}

async function recordError(integrationId: string, message: string): Promise<void> {
  await db
    .update(googleCalendarIntegrations)
    .set({ lastError: message, lastErrorAt: new Date(), updatedAt: new Date() })
    .where(eq(googleCalendarIntegrations.id, integrationId));
}

async function recordSuccess(integrationId: string): Promise<void> {
  await db
    .update(googleCalendarIntegrations)
    .set({ lastError: null, lastErrorAt: null, lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(googleCalendarIntegrations.id, integrationId));
}

export async function push(args: PushArgs): Promise<void> {
  if (!isEnabled()) return;

  let integrationId: string | null = null;

  try {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, args.appointmentId));
    if (!appt) return;

    const [integration] = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.professionalId, appt.professionalId));

    if (!integration || integration.status !== 'active') return;
    integrationId = integration.id;

    const [[apptType], [patient], [professional]] = await Promise.all([
      db.select().from(appointmentTypes).where(eq(appointmentTypes.id, appt.appointmentTypeId)),
      db.select().from(patients).where(eq(patients.id, appt.patientId)),
      db.select().from(professionals).where(eq(professionals.id, appt.professionalId)),
    ]);

    if (!apptType || !patient || !professional) return;

    const locationAddress = [
      professional.addressStreet,
      professional.addressPostal,
      professional.addressCity,
    ]
      .filter(Boolean)
      .join(', ') || null;

    const eventPayload = appointmentToGoogleEvent({
      appointmentId: appt.id,
      startAt: appt.startAt,
      endAt: appt.endAt,
      notes: appt.notes,
      patientFirstName: patient.firstName,
      patientLastName: patient.lastName,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      appointmentTypeName: apptType.name,
      locationAddress,
    });

    const auth = await getOAuthClient(integration);

    let op: SyncOp = args.op;
    if (op === 'create' && appt.googleEventId) op = 'update';
    if ((op === 'update' || op === 'delete') && !appt.googleEventId) return;

    if (op === 'create') {
      const googleEventId = await createEvent(auth, eventPayload);
      await db
        .update(appointments)
        .set({ googleEventId, updatedAt: new Date() })
        .where(eq(appointments.id, appt.id));
    } else if (op === 'update') {
      await updateEvent(auth, appt.googleEventId!, eventPayload);
    } else {
      await deleteEvent(auth, appt.googleEventId!);
      await db
        .update(appointments)
        .set({ googleEventId: null, updatedAt: new Date() })
        .where(eq(appointments.id, appt.id));
    }

    await recordSuccess(integration.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (integrationId) {
      try {
        await recordError(integrationId, message);
      } catch {
        // nothing more we can do
      }
    }
    if (err instanceof InvalidGrantError) return;
  }
}
