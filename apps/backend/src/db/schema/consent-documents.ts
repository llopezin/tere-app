import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { professionals } from './professionals.js';

export const consentDocuments = pgTable('consent_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  title: text('title').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const selectConsentDocumentSchema = createSelectSchema(consentDocuments);

export const insertConsentDocumentSchema = createInsertSchema(consentDocuments, {
  title: schema => schema.min(1),
  content: schema => schema.min(1),
}).omit({
  id: true,
  professionalId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateConsentDocumentSchema = insertConsentDocumentSchema.partial();
