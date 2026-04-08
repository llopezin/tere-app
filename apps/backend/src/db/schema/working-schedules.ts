import { pgTable, uuid, smallint, time, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { professionals } from './professionals.js';

export const workingSchedules = pgTable('working_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  dayOfWeek: smallint('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('chk_day_of_week', sql`${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6`),
  check('chk_end_after_start', sql`${table.endTime} > ${table.startTime}`),
]);

export const selectWorkingScheduleSchema = createSelectSchema(workingSchedules);

export const scheduleSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
});

export const bulkScheduleSchema = z.object({
  slots: z.array(scheduleSlotSchema),
});
