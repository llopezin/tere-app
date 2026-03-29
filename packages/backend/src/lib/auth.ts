import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import * as schema from '../db/schema/auth-schema.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ['http://localhost:5173'],
  emailAndPassword: {
    enabled: true,
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
          const nameParts = user.name.split(' ');
          const firstName = nameParts[0] || user.name;
          const lastName = nameParts.slice(1).join(' ') || '';

          if (user.role === 'professional') {
            const [prof] = await db.insert(professionals).values({
              authUserId: user.id,
              firstName,
              lastName,
              email: user.email,
            }).returning();

            await db.update(schema.user)
              .set({ profileId: prof.id })
              .where(eq(schema.user.id, user.id));
          } else if (user.role === 'patient') {
            const [patient] = await db.insert(patients).values({
              authUserId: user.id,
              firstName,
              lastName,
              email: user.email,
              phone: '',
            }).returning();

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
