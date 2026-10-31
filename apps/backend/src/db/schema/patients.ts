import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { professionals } from './professionals.js';
import { user } from './auth-schema.js';
import { phoneSchema, nieSchema } from '@fisio-app/validators';

export const patients = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: text('auth_user_id').unique().references(() => user.id, { onDelete: 'set null' }),
  professionalId: uuid('professional_id').references(() => professionals.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nie: text('nie'),
  phone: text('phone').notNull(),
  email: text('email'),
  dateOfBirth: date('date_of_birth'),
  addressStreet: text('address_street'),
  addressPostal: text('address_postal'),
  addressCity: text('address_city'),
  addressProvince: text('address_province'),
  addressCountry: text('address_country').default('España'),
  contactMethod: text('contact_method', { enum: ['email', 'sms', 'whatsapp'] }),
  clinicalNotes: text('clinical_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const selectPatientSchema = createSelectSchema(patients);

/**
 * Legacy columns: ownership and clinical notes moved to `professional_patients` (N:M).
 * `professionalId` and `clinicalNotes` are kept until a follow-up migration drops them; do not read them.
 */
const legacyColumns = { professionalId: true, clinicalNotes: true } as const;

/** Patient as seen by a professional. `clinicalNotes` comes from `professional_patients`. */
export const selectPatientForProfessionalSchema = selectPatientSchema.omit({ professionalId: true });

/** Patient as seen by themselves: never includes clinical notes. */
export const selectOwnPatientSchema = selectPatientSchema.omit(legacyColumns);

export const insertPatientSchema = createInsertSchema(patients, {
  firstName: schema => schema.min(1),
  lastName: schema => schema.min(1),
  phone: () => phoneSchema,
  nie: () => nieSchema.optional(),
  email: schema => schema.email().optional(),
}).omit({
  id: true,
  authUserId: true,
  professionalId: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePatientSchema = insertPatientSchema.partial();

/** What a patient can change about themselves (clinical notes belong to the professional). */
export const updateOwnPatientSchema = updatePatientSchema.omit({ clinicalNotes: true });
