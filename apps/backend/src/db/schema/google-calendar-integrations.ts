import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { professionals } from './professionals.js';

export const googleCalendarIntegrations = pgTable('google_calendar_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().unique().references(() => professionals.id, { onDelete: 'cascade' }),
  googleSub: text('google_sub').notNull(),
  googleEmail: text('google_email').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
  scope: text('scope'),
  status: text('status', { enum: ['active', 'revoked'] }).notNull().default('active'),
  lastError: text('last_error'),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const selectGoogleCalendarIntegrationSchema = createSelectSchema(googleCalendarIntegrations).omit({
  accessToken: true,
  refreshToken: true,
});

export type GoogleCalendarIntegration = typeof googleCalendarIntegrations.$inferSelect;
