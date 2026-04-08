import { pgTable, uuid, text, decimal, integer, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { professionals } from './professionals.js';
import { patients } from './patients.js';
import { appointmentTypes } from './appointment-types.js';

export const bonos = pgTable('bonos', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  appointmentTypeId: uuid('appointment_type_id').notNull().references(() => appointmentTypes.id),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  totalSessions: integer('total_sessions').notNull(),
  sessionsUsed: integer('sessions_used').notNull().default(0),
  status: text('status', { enum: ['active', 'exhausted'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('chk_total_sessions_positive', sql`${table.totalSessions} > 0`),
  check('chk_sessions_used_non_negative', sql`${table.sessionsUsed} >= 0`),
]);

export const selectBonoSchema = createSelectSchema(bonos);

export const insertBonoSchema = createInsertSchema(bonos, {
  totalSessions: schema => schema.positive(),
}).omit({
  id: true,
  professionalId: true,
  sessionsUsed: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  price: true,
}).extend({
  price: z.coerce.number().nonnegative(),
});

export const deductBonoSchema = z.object({});
