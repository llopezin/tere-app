import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { bonos } from './bonos.js';
import { appointments } from './appointments.js';

export const bonoTransactions = pgTable('bono_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bonoId: uuid('bono_id').notNull().references(() => bonos.id),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  type: text('type', { enum: ['deduction', 'refund', 'manual_deduction'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
