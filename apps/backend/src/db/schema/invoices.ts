import { pgTable, uuid, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { professionals } from './professionals.js';
import { patients } from './patients.js';
import { appointments } from './appointments.js';
import { payments } from './payments.js';

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  paymentId: uuid('payment_id').references(() => payments.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  // Snapshots
  profName: text('prof_name').notNull(),
  profTaxId: text('prof_tax_id'),
  profAddress: text('prof_address'),
  patientName: text('patient_name').notNull(),
  patientTaxId: text('patient_tax_id'),
  patientAddress: text('patient_address'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const selectInvoiceSchema = createSelectSchema(invoices);

export const insertInvoiceSchema = z.object({
  appointmentId: z.string().uuid(),
  paymentId: z.string().uuid().nullable().optional(),
});
