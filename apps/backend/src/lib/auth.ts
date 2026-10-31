import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import * as schema from '../db/schema/auth-schema.js';
import { env } from '../config/env.js';
import { normalizeOrigin } from '../middleware/origin.js';

type NewProfessional = InferInsertModel<typeof professionals>;
type NewPatient = InferInsertModel<typeof patients>;

const ROLE_BY_APP = { client: 'patient', professional: 'professional' } as const;

function appForOrigin(origin: string): keyof typeof ROLE_BY_APP | undefined {
  const normalized = normalizeOrigin(origin);
  if (normalized === normalizeOrigin(env.CLIENT_APP_URL)) return 'client';
  if (normalized === normalizeOrigin(env.PROFESSIONAL_APP_URL)) return 'professional';
  return undefined;
}


export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [
    openAPI({
      path: '/reference',
    }),
  ],
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CLIENT_APP_URL, env.PROFESSIONAL_APP_URL],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const origin = ctx.headers?.get('origin');
      const app = origin ? appForOrigin(origin) : undefined;

      // Public sign-up only creates patients, and only from client-app.
      // Professionals are created server-side (scripts/create-professional.ts, future admin-panel).
      if (ctx.path === '/sign-up/email' && app === 'professional') {
        throw new APIError('FORBIDDEN', { message: 'Sign up is not available in this application' });
      }

      // Each app only accepts its own role. Same error as a wrong password, so this does not
      // reveal whether an email exists or which role it has.
      if (ctx.path === '/sign-in/email' && app) {
        const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : undefined;
        const found = email ? await ctx.context.internalAdapter.findUserByEmail(email) : null;
        const role = (found?.user as { role?: string } | undefined)?.role;
        if (found && role !== ROLE_BY_APP[app]) {
          throw new APIError('UNAUTHORIZED', { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' });
        }
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false // We dynamically sign in after creation to guarantee profile entry is created and already linked to profile ID
  },
  user: {
    additionalFields: {
      // Never settable by the client: public sign-up always creates a patient
      role: {
        type: 'string',
        required: true,
        defaultValue: 'patient',
        input: false,
      },
      profileId: {
        type: 'string',
        required: false,
        input: false,
      },
      firstName: {
        type: 'string',
        required: true,
        input: true,
      },
      lastName: {
        type: 'string',
        required: true,
        input: true,
      },
      phone: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const fName = (user as any).firstName as string | undefined;
          const lName = (user as any).lastName as string | undefined;
          const firstName = fName || user.name.split(' ')[0] || user.name;
          const lastName = lName || user.name.split(' ').slice(1).join(' ') || '';

          if (user.role === 'professional') {
            const profValues: NewProfessional = {
              authUserId: user.id,
              firstName,
              lastName,
              email: user.email,
            };
            const [prof] = await db.insert(professionals).values(profValues).returning();

            await db.update(schema.user)
              .set({ profileId: prof.id })
              .where(eq(schema.user.id, user.id));
          } else if (user.role === 'patient') {
            const phone = (user as any).phone as string | undefined;
            const patValues: NewPatient = {
              authUserId: user.id,
              firstName,
              lastName,
              email: user.email,
              phone: phone || '',
            };
            const [patient] = await db.insert(patients).values(patValues).returning();

            await db.update(schema.user)
              .set({ profileId: patient.id })
              .where(eq(schema.user.id, user.id));
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
