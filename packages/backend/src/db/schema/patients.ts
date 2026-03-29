import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';
import { user } from './auth-schema.js';

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
  contactMethod: text('contact_method', { enum: ['email', 'sms', 'whatsapp'] }).notNull().default('whatsapp'),
  clinicalNotes: text('clinical_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
