import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { patients } from './patients.js';

export const patientBillingData = pgTable('patient_billing_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id').notNull().unique().references(() => patients.id),
  billingName: text('billing_name').notNull(),
  addressStreet: text('address_street'),
  addressPostal: text('address_postal'),
  addressCity: text('address_city'),
  addressProvince: text('address_province'),
  addressCountry: text('address_country'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
