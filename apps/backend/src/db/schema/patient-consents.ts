import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { consentDocuments } from './consent-documents.js';
import { patients } from './patients.js';
import { professionals } from './professionals.js';

export const patientConsents = pgTable('patient_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  consentDocumentId: uuid('consent_document_id').notNull().references(() => consentDocuments.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  status: text('status', { enum: ['pending', 'signed'] }).notNull().default('pending'),
  signatureData: text('signature_data'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_patient_consent_doc').on(table.consentDocumentId, table.patientId),
]);

export const selectPatientConsentSchema = createSelectSchema(patientConsents);

export const assignConsentSchema = z.object({
  consentDocumentId: z.string().uuid(),
});

export const signConsentSchema = z.object({
  signatureData: z.string().min(1),
});
