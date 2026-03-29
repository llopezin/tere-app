import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const professionals = pgTable('professionals', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: text('auth_user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  taxId: text('tax_id'),
  addressStreet: text('address_street'),
  addressPostal: text('address_postal'),
  addressCity: text('address_city'),
  addressProvince: text('address_province'),
  addressCountry: text('address_country').default('España'),
  googleCalendarId: text('google_calendar_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
