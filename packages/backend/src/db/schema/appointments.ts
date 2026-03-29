import { pgTable, uuid, text, decimal, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { professionals } from './professionals.js';
import { patients } from './patients.js';
import { appointmentTypes } from './appointment-types.js';
import { bonos } from './bonos.js';

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  appointmentTypeId: uuid('appointment_type_id').notNull().references(() => appointmentTypes.id),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled', 'no_show'] }).notNull().default('scheduled'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  recurrenceGroupId: uuid('recurrence_group_id'),
  bonoId: uuid('bono_id').references(() => bonos.id),
  useBonoSession: boolean('use_bono_session').notNull().default(true),
  googleEventId: text('google_event_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_appt_professional_start').on(table.professionalId, table.startAt),
  check('chk_appt_end_after_start', sql`${table.endAt} > ${table.startAt}`),
]);
