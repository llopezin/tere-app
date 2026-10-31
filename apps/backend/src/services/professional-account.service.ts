import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { user as userTable } from '../db/schema/auth-schema.js';

export interface CreateProfessionalAccountInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Creates a professional login + profile. This is the only way to get the `professional` role:
 * public sign-up cannot set it (`role.input = false`). Used by scripts/create-professional.ts
 * and, in the future, by the admin panel.
 */
export async function createProfessionalAccount(input: CreateProfessionalAccountInput) {
  const ctx = await auth.$context;
  const email = input.email.trim().toLowerCase();

  if (input.password.length < ctx.password.config.minPasswordLength) {
    throw new Error(`Password must be at least ${ctx.password.config.minPasswordLength} characters`);
  }
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new Error(`A user with email ${email} already exists`);
  }

  // internalAdapter skips input validation (so `role` can be set) but still runs databaseHooks,
  // which create the `professionals` row and set `user.profileId`.
  const created = await ctx.internalAdapter.createUser({
    email,
    name: `${input.firstName} ${input.lastName}`.trim(),
    emailVerified: false,
    role: 'professional',
    firstName: input.firstName,
    lastName: input.lastName,
  });

  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: 'credential',
    accountId: created.id,
    password: await ctx.password.hash(input.password),
  });

  const [professional] = await db.select().from(professionals).where(eq(professionals.authUserId, created.id));
  if (!professional) {
    // Should not happen: the user.create.after hook creates it. Fail loudly instead of leaving a half account.
    await db.delete(userTable).where(eq(userTable.id, created.id));
    throw new Error('Professional profile was not created');
  }

  return { userId: created.id, professional };
}
