import app from '../app.js';
import { testDb } from './setup.js';
import { professionalPatients } from '../db/schema/professional-patients.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { user } from '../db/schema/auth-schema.js';
import { createProfessionalAccount } from '../services/professional-account.service.js';
import { eq } from 'drizzle-orm';

export const CLIENT_ORIGIN = process.env.CLIENT_APP_URL!;
export const PROFESSIONAL_ORIGIN = process.env.PROFESSIONAL_APP_URL!;
const PASSWORD = 'password-123456';

export interface Actor {
  cookie: string;
  profileId: string;
  origin: string;
}

interface RequestOptions {
  json?: unknown;
  origin?: string | null;
  cookie?: string;
}

/** Calls the app in-process like a browser of `actor.origin` would (Origin + session cookie). */
export async function call(actor: Actor | null, method: string, path: string, opts: RequestOptions = {}) {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? actor?.origin : opts.origin;
  if (origin) headers.origin = origin;
  const cookie = opts.cookie ?? actor?.cookie;
  if (cookie) headers.cookie = cookie;
  if (opts.json !== undefined) headers['content-type'] = 'application/json';
  return app.request(path, {
    method,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
  });
}

function sessionCookie(res: Response): string {
  const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0]);
  if (!cookies.length) throw new Error(`No session cookie (status ${res.status})`);
  return cookies.join('; ');
}

export async function signIn(email: string, origin: string, password = PASSWORD) {
  return call(null, 'POST', '/api/auth/sign-in/email', { origin, json: { email, password } });
}

export async function signUpPatient(email: string, extra: Record<string, unknown> = {}, origin = CLIENT_ORIGIN) {
  return call(null, 'POST', '/api/auth/sign-up/email', {
    origin,
    json: { email, password: PASSWORD, name: 'Test Patient', firstName: 'Test', lastName: 'Patient', phone: '600000000', ...extra },
  });
}

/** A patient that signed up through client-app, with RGPD signed. */
export async function patientActor(label: string): Promise<Actor> {
  const email = `${label}-${crypto.randomUUID()}@test.com`;
  const res = await signUpPatient(email);
  if (!res.ok) throw new Error(`Patient sign-up failed: ${res.status} ${await res.text()}`);
  const login = await signIn(email, CLIENT_ORIGIN);
  if (!login.ok) throw new Error(`Patient sign-in failed: ${login.status}`);
  const [u] = await testDb.select().from(user).where(eq(user.email, email));
  await testDb.insert(rgpdConsents).values({ patientId: u.profileId!, signed: true, signedAt: new Date() }).onConflictDoNothing();
  return { cookie: sessionCookie(login), profileId: u.profileId!, origin: CLIENT_ORIGIN };
}

export async function professionalActor(label: string): Promise<Actor> {
  const email = `${label}-${crypto.randomUUID()}@test.com`;
  const { professional } = await createProfessionalAccount({ email, password: PASSWORD, firstName: label, lastName: 'Pro' });
  const login = await signIn(email, PROFESSIONAL_ORIGIN);
  if (!login.ok) throw new Error(`Professional sign-in failed: ${login.status} ${await login.text()}`);
  return { cookie: sessionCookie(login), profileId: professional.id, origin: PROFESSIONAL_ORIGIN };
}

export async function link(professional: Actor, patient: Actor) {
  await testDb.insert(professionalPatients).values({ professionalId: professional.profileId, patientId: patient.profileId });
}
