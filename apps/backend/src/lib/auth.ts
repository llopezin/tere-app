import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { DEFAULT_ROLE, ROLES, isRole, type Role } from './roles.js';
import type { InferInsertModel } from 'drizzle-orm';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import * as schema from '../db/schema/auth-schema.js';
import { env, trustedFrontendOrigins } from '../config/env.js';

type NewProfessional = InferInsertModel<typeof professionals>;
type NewPatient = InferInsertModel<typeof patients>;

type FrontendApp = 'client' | 'professional';

/** The only role each frontend accepts on sign-in. */
const ROLE_BY_APP: Record<FrontendApp, Role> = { client: ROLES.patient, professional: ROLES.professional };

interface NewUserProfileInput {
  user: { id: string; email: string; phone?: string };
  firstName: string;
  lastName: string;
}

/**
 * Profile row created for each role on sign-up; returns its id (stored in `user.profileId`),
 * or null for roles without a profile. Typed as Record<Role, …> so adding a role forces handling it here.
 */
const createProfileByRole: Record<Role, (input: NewUserProfileInput) => Promise<string | null>> = {
  [ROLES.professional]: async ({ user, firstName, lastName }) => {
    const profValues: NewProfessional = { authUserId: user.id, firstName, lastName, email: user.email };
    const [prof] = await db.insert(professionals).values(profValues).returning({ id: professionals.id });
    return prof.id;
  },
  [ROLES.patient]: async ({ user, firstName, lastName }) => {
    const patValues: NewPatient = { authUserId: user.id, firstName, lastName, email: user.email, phone: user.phone || '' };
    const [patient] = await db.insert(patients).values(patValues).returning({ id: patients.id });
    return patient.id;
  },
};

/** Env origins are already canonical (config/env.ts) and browsers send `Origin` in that same form. */
function appForOrigin(origin: string): FrontendApp | undefined {
  if (origin === env.CLIENT_APP_URL) return 'client';
  if (origin === env.PROFESSIONAL_APP_URL) return 'professional';
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
  trustedOrigins: trustedFrontendOrigins,
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const origin = ctx.headers?.get('origin');
      const app = origin ? appForOrigin(origin) : undefined;

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
      // Never settable by the client: this is what guarantees public sign-up always creates a patient.
      // Professionals are created server-side (scripts/create-professional.ts, future admin panel).
      role: {
        type: 'string',
        required: true,
        defaultValue: DEFAULT_ROLE,
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

          if (!isRole(user.role)) throw new Error(`Unknown role: ${user.role}`);
          const profileId = await createProfileByRole[user.role]({
            user: user as typeof user & { phone?: string },
            firstName,
            lastName,
          });
          if (!profileId) return;

          await db.update(schema.user)
            .set({ profileId })
            .where(eq(schema.user.id, user.id));
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
