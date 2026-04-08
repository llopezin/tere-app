import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients.js';

export const rgpdConsents = pgTable('rgpd_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id').notNull().unique().references(() => patients.id),
  signed: boolean('signed').notNull().default(false),
  signatureData: text('signature_data'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const selectRgpdConsentSchema = createSelectSchema(rgpdConsents);

export const submitConsentSchema = z.object({
  signatureData: z.string().min(1),
  signed: z.literal(true),
});
