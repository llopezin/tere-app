import { pgTable, uuid, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { professionals } from './professionals.js';
import { patients } from './patients.js';
import { appointments } from './appointments.js';
import { bonos } from './bonos.js';

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  bonoId: uuid('bono_id').references(() => bonos.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method', { enum: ['card', 'bizum', 'cash'] }).notNull(),
  status: text('status', { enum: ['pending', 'paid'] }).notNull().default('paid'),
  paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_payments_professional_paid').on(table.professionalId, table.paidAt),
]);

export const selectPaymentSchema = createSelectSchema(payments);

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  professionalId: true,
  status: true,
  createdAt: true,
  amount: true,
  paidAt: true,
}).extend({
  amount: z.coerce.number().positive(),
  paidAt: z.string().datetime().optional(),
});
