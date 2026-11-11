import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './auth-schema.js';
import { phoneSchema, nieSchema } from '@fisio-app/validators';

/**
 * Personal data of a patient, shared by all their professionals.
 * Which professionals a patient belongs to, and each one's clinical notes, live in `professional_patients` (N:M).
 */
export const patients = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: text('auth_user_id').unique().references(() => user.id, { onDelete: 'set null' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nie: text('nie').unique(),
  phone: text('phone').notNull(),
  email: text('email'),
  dateOfBirth: date('date_of_birth'),
  addressStreet: text('address_street'),
  addressPostal: text('address_postal'),
  addressCity: text('address_city'),
  addressProvince: text('address_province'),
  addressCountry: text('address_country').default('España'),
  contactMethod: text('contact_method', { enum: ['email', 'sms', 'whatsapp'] }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const selectPatientSchema = createSelectSchema(patients);

/** Patient as seen by a professional: shared personal data + that professional's clinical notes (from `professional_patients`). */
export const selectPatientForProfessionalSchema = selectPatientSchema.extend({
  clinicalNotes: z.string().nullable(),
});

const patientDataSchema = createInsertSchema(patients, {
  firstName: schema => schema.min(1),
  lastName: schema => schema.min(1),
  phone: () => phoneSchema,
  nie: () => nieSchema.optional(),
  email: schema => schema.email().optional(),
}).omit({
  id: true,
  authUserId: true,
  createdAt: true,
  updatedAt: true,
});

/** What a professional sends when creating a patient. `clinicalNotes` is stored in `professional_patients`. */
export const insertPatientSchema = patientDataSchema.extend({
  clinicalNotes: z.string().nullish(),
});

export const updatePatientSchema = insertPatientSchema.partial();

/** What a patient can change about themselves (clinical notes belong to the professional). */
export const updateOwnPatientSchema = patientDataSchema.partial();
