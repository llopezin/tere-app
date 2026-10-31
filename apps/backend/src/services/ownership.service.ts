/**
 * Ownership checks used by the BFF handlers.
 *
 * Rule: every id received in params, query or body that is not the route's own resource
 * must go through one of these helpers before being used.
 * They throw 404 (not 403) so callers cannot probe which ids exist.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { professionalPatients } from '../db/schema/professional-patients.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { bonos } from '../db/schema/bonos.js';
import { appointments } from '../db/schema/appointments.js';
import { payments } from '../db/schema/payments.js';
import { consentDocuments } from '../db/schema/consent-documents.js';
import { professionals } from '../db/schema/professionals.js';
import { AppError } from '../middleware/error-handler.js';

type Db = typeof db;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Executor = Db | Tx;

interface Owner {
  professionalId?: string;
  patientId?: string;
}

export async function isPatientOfProfessional(professionalId: string, patientId: string, executor: Executor = db) {
  const [row] = await executor.select({ patientId: professionalPatients.patientId })
    .from(professionalPatients)
    .where(and(eq(professionalPatients.professionalId, professionalId), eq(professionalPatients.patientId, patientId)));
  return !!row;
}

export async function assertPatientOfProfessional(professionalId: string, patientId: string) {
  if (!(await isPatientOfProfessional(professionalId, patientId))) {
    throw new AppError(404, 'Patient not found');
  }
}

/** Idempotently links a patient to a professional. */
export async function linkPatientToProfessional(professionalId: string, patientId: string, executor: Executor = db) {
  await executor.insert(professionalPatients)
    .values({ professionalId, patientId })
    .onConflictDoNothing();
}

export async function assertProfessionalExists(professionalId: string) {
  const [row] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.id, professionalId));
  if (!row) throw new AppError(404, 'Professional not found');
}

export async function assertAppointmentTypeOf(
  professionalId: string,
  appointmentTypeId: string,
  { activeOnly = false }: { activeOnly?: boolean } = {},
) {
  const conditions = [eq(appointmentTypes.id, appointmentTypeId), eq(appointmentTypes.professionalId, professionalId)];
  if (activeOnly) conditions.push(eq(appointmentTypes.isActive, true));
  const [type] = await db.select().from(appointmentTypes).where(and(...conditions));
  if (!type) throw new AppError(404, 'Appointment type not found');
  return type;
}

/** `appointmentTypeId`: when booking, a bono can only pay for the appointment type it was sold for. */
export async function assertBonoOf(owner: Owner & { appointmentTypeId?: string }, bonoId: string) {
  const conditions = [eq(bonos.id, bonoId)];
  if (owner.appointmentTypeId) conditions.push(eq(bonos.appointmentTypeId, owner.appointmentTypeId));
  if (owner.professionalId) conditions.push(eq(bonos.professionalId, owner.professionalId));
  if (owner.patientId) conditions.push(eq(bonos.patientId, owner.patientId));
  const [bono] = await db.select().from(bonos).where(and(...conditions));
  if (!bono) throw new AppError(404, 'Bono not found');
  return bono;
}

export async function assertAppointmentOf(owner: Owner, appointmentId: string) {
  const conditions = [eq(appointments.id, appointmentId)];
  if (owner.professionalId) conditions.push(eq(appointments.professionalId, owner.professionalId));
  if (owner.patientId) conditions.push(eq(appointments.patientId, owner.patientId));
  const [appt] = await db.select().from(appointments).where(and(...conditions));
  if (!appt) throw new AppError(404, 'Appointment not found');
  return appt;
}

export async function assertPaymentOf(owner: Owner, paymentId: string) {
  const conditions = [eq(payments.id, paymentId)];
  if (owner.professionalId) conditions.push(eq(payments.professionalId, owner.professionalId));
  if (owner.patientId) conditions.push(eq(payments.patientId, owner.patientId));
  const [payment] = await db.select().from(payments).where(and(...conditions));
  if (!payment) throw new AppError(404, 'Payment not found');
  return payment;
}

export async function assertConsentDocumentOf(professionalId: string, consentDocumentId: string) {
  const [doc] = await db.select().from(consentDocuments)
    .where(and(eq(consentDocuments.id, consentDocumentId), eq(consentDocuments.professionalId, professionalId)));
  if (!doc) throw new AppError(404, 'Consent document not found');
  return doc;
}
