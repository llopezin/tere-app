import { pgTable, uuid, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { professionals } from './professionals.js';

export const blockedTimes = pgTable('blocked_times', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('chk_blocked_end_after_start', sql`${table.endAt} > ${table.startAt}`),
]);

export const selectBlockedTimeSchema = createSelectSchema(blockedTimes);

export const insertBlockedTimeSchema = createInsertSchema(blockedTimes).omit({
  id: true,
  professionalId: true,
  createdAt: true,
  startAt: true,
  endAt: true,
}).extend({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
