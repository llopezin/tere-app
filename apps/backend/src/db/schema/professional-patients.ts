import { pgTable, uuid, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.js';
import { patients } from './patients.js';

/**
 * N:M relation between professionals and patients.
 * A patient becomes "of" a professional when the professional registers them
 * or when the patient books an appointment with that professional.
 * Data that belongs to the relation (not to the patient), like clinical notes, lives here.
 */
export const professionalPatients = pgTable('professional_patients', {
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  clinicalNotes: text('clinical_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.professionalId, table.patientId] }),
  index('idx_professional_patients_patient').on(table.patientId),
]);
