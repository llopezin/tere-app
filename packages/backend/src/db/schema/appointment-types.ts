import { pgTable, uuid, text, integer, decimal, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';

export const appointmentTypes = pgTable('appointment_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  name: text('name').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_prof_appt_type_name').on(table.professionalId, table.name),
]);
