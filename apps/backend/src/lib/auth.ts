import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import * as schema from '../db/schema/auth-schema.js';
import { env } from '../config/env.js';

type NewProfessional = InferInsertModel<typeof professionals>;
type NewPatient = InferInsertModel<typeof patients>;


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
  trustedOrigins: [env.FRONTEND_URL],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false // We dynamically sign in after creation to guarantee profile entry is created and already linked to profile ID
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'patient',
        input: true,
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
