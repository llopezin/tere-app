import { pgTable, uuid, text, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
