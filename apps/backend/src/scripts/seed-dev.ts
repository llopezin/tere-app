/**
 * Empties the local dev database and fills it with test data:
 * 2 professionals (3 appointment types, working hours and blocked times each), 23 + 12 patients,
 * past and future appointments, and a bono for every other patient.
 * Writes every test login to docs/dev-users.md (gitignored).
 *
 * DEV ONLY: it deletes every row. It refuses to run against a non-local database.
 *
 * Usage: pnpm --filter @fisio-app/backend db:seed
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { auth } from '../lib/auth.js';
import { createProfessionalAccount } from '../services/professional-account.service.js';
import { patients } from '../db/schema/patients.js';
import { professionalPatients } from '../db/schema/professional-patients.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { appointments } from '../db/schema/appointments.js';
import { bonos } from '../db/schema/bonos.js';

const PASSWORD = 'fisio-dev-1234';
const CREDENTIALS_FILE = fileURLToPath(new URL('../../../../docs/dev-users.md', import.meta.url));
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const { hostname } = new URL(env.DATABASE_URL);
if (env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(hostname)) {
  console.error(`Refusing to seed: ${hostname} is not a local database.`);
  process.exit(1);
}

type ContactMethod = 'email' | 'sms' | 'whatsapp';
/** [dayOfWeek (0 = Monday), start, end] */
type ScheduleBlock = [number, string, string];

interface ProfessionalSeed {
  email: string;
  firstName: string;
  lastName: string;
  appointmentTypes: { name: string; durationMinutes: number; price: string }[];
  schedule: ScheduleBlock[];
  /** Full names. The last `withoutAccount` patients are created by the professional and cannot sign in. */
  patients: string[];
  withoutAccount: number;
}

const PROFESSIONALS: ProfessionalSeed[] = [
  {
    email: 'teresaquintanagarcia@gmail.com',
    firstName: 'Teresa',
    lastName: 'Quintana García',
    appointmentTypes: [
      { name: 'Consulta Inicial', durationMinutes: 60, price: '50.00' },
      { name: 'Fisioterapia Deportiva', durationMinutes: 45, price: '50.00' },
      { name: 'Fisioterapia Neurológica', durationMinutes: 45, price: '45.00' },
    ],
    schedule: [
      [0, '09:00', '14:00'], [0, '16:00', '20:00'],
      [1, '09:00', '14:00'], [1, '16:00', '20:00'],
      [2, '09:00', '14:00'],
      [3, '09:00', '14:00'], [3, '16:00', '20:00'],
      [4, '09:00', '14:00'],
    ],
    patients: [
      'María López', 'Pedro Martínez', 'Elena Sánchez', 'Javier Hernández', 'Carmen Díaz',
      'Lucía Romero', 'Pablo Navarro', 'Sara Torres', 'Daniel Ramos', 'Laura Gil',
      'Alejandro Serrano', 'Marta Molina', 'Adrián Blanco', 'Paula Castro', 'Sergio Ortega',
      'Irene Rubio', 'Diego Marín', 'Andrea Sanz', 'Raúl Iglesias', 'Nuria Medina',
      'Hugo Garrido', 'Cristina Cortés', 'Álvaro Lozano',
    ],
    withoutAccount: 3,
  },
  {
    email: 'javier.ruiz@example.com',
    firstName: 'Javier',
    lastName: 'Ruiz Moreno',
    appointmentTypes: [
      { name: 'Valoración', durationMinutes: 30, price: '35.00' },
      { name: 'Masaje Terapéutico', durationMinutes: 45, price: '40.00' },
      { name: 'Fisioterapia Suelo Pélvico', durationMinutes: 60, price: '60.00' },
    ],
    schedule: [
      [0, '10:00', '14:00'],
      [1, '10:00', '14:00'], [1, '16:00', '19:00'],
      [2, '10:00', '14:00'],
      [3, '10:00', '14:00'], [3, '16:00', '19:00'],
      [4, '10:00', '13:00'],
    ],
    patients: [
      'Beatriz Vidal', 'Manuel Fuentes', 'Silvia Carrasco', 'Iván Pascual', 'Rocío Herrera',
      'Óscar Vega', 'Patricia León', 'Rubén Campos', 'Alicia Prieto', 'Mario Calvo',
      'Natalia Reyes', 'Víctor Méndez',
    ],
    withoutAccount: 2,
  },
];

const CONTACT_METHODS: ContactMethod[] = ['whatsapp', 'email', 'sms'];
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Deterministic PRNG (mulberry32), so every run creates the same data relative to today. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20261117);
const randomInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toEmail(fullName: string) {
  const ascii = fullName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return `${ascii.replace(/\s+/g, '.')}@example.com`;
}

function dni(n: number) {
  const digits = 10_000_000 + n * 104_729;
  return `${digits}${DNI_LETTERS[digits % 23]}`;
}

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/** A day at a local time, `days` days from today. */
function at(days: number, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(startOfToday().getTime() + days * DAY);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** Monday = 0, as in `working_schedules.day_of_week`. */
const dayOfWeek = (date: Date) => (date.getDay() + 6) % 7;

function blockedTimesFor(index: number) {
  const offset = index * 2;
  return [
    { startAt: at(-20 + offset, '16:00'), endAt: at(-20 + offset, '20:00') },
    { startAt: at(2 + offset, '12:00'), endAt: at(2 + offset, '14:00') },
    { startAt: at(8 + offset, '00:00'), endAt: at(9 + offset, '00:00') },
    { startAt: at(35 + offset, '00:00'), endAt: at(40 + offset, '00:00') },
  ];
}

/** One-hour slots inside the working hours, from 120 days ago to 21 days ahead, outside blocked times. */
function slotsFor(schedule: ScheduleBlock[], blocked: { startAt: Date; endAt: Date }[]) {
  const slots: Date[] = [];
  for (let day = -120; day <= 21; day++) {
    const weekday = dayOfWeek(at(day, '00:00'));
    for (const [blockDay, start, end] of schedule) {
      if (blockDay !== weekday) continue;
      for (let slot = at(day, start); slot.getTime() + HOUR <= at(day, end).getTime(); slot = new Date(slot.getTime() + HOUR)) {
        const slotEnd = slot.getTime() + HOUR;
        if (blocked.some((b) => slot < b.endAt && slotEnd > b.startAt.getTime())) continue;
        slots.push(slot);
      }
    }
  }
  const now = Date.now();
  return {
    past: shuffle(slots.filter((s) => s.getTime() < now)),
    future: shuffle(slots.filter((s) => s.getTime() > now + HOUR)),
  };
}

async function resetDb() {
  await db.transaction(async (tx) => {
    await tx.execute('SET LOCAL client_min_messages = warning');
    // Every table references "user" directly or transitively, so CASCADE empties them all
    await tx.execute('TRUNCATE TABLE "user", verification CASCADE');
  });
}

interface Login {
  role: string;
  name: string;
  email: string;
  detail: string;
}

async function seedProfessional(seed: ProfessionalSeed, index: number, logins: Login[], withoutAccount: Login[]) {
  const { professional } = await createProfessionalAccount({
    email: seed.email,
    password: PASSWORD,
    firstName: seed.firstName,
    lastName: seed.lastName,
  });
  const professionalName = `${seed.firstName} ${seed.lastName}`;
  logins.push({ role: 'Profesional', name: professionalName, email: seed.email, detail: `${seed.patients.length} pacientes` });

  const types = await db.insert(appointmentTypes)
    .values(seed.appointmentTypes.map((type) => ({ ...type, professionalId: professional.id })))
    .returning();

  await db.insert(workingSchedules).values(seed.schedule.map(([day, startTime, endTime]) => ({
    professionalId: professional.id, dayOfWeek: day, startTime, endTime,
  })));

  const blocked = blockedTimesFor(index);
  await db.insert(blockedTimes).values(blocked.map((b) => ({ ...b, professionalId: professional.id })));

  const slots = slotsFor(seed.schedule, blocked);

  for (const [i, fullName] of seed.patients.entries()) {
    const [firstName, lastName] = fullName.split(' ');
    const email = toEmail(fullName);
    const phone = `+34 6${String(index + 1).padStart(2, '0')} ${String(100 + i).padStart(3, '0')} ${String(200 + i).padStart(3, '0')}`;
    const hasAccount = i < seed.patients.length - seed.withoutAccount;

    const patientId = hasAccount
      ? await signUpPatient({ email, firstName, lastName, phone })
      : (await db.insert(patients).values({ firstName, lastName, email, phone }).returning({ id: patients.id }))[0].id;

    await db.update(patients).set({
      nie: dni(index * 100 + i),
      contactMethod: CONTACT_METHODS[i % CONTACT_METHODS.length],
      dateOfBirth: `${1960 + randomInt(0, 45)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
      addressCity: 'Madrid',
      addressProvince: 'Madrid',
    }).where(eq(patients.id, patientId));

    await db.insert(professionalPatients).values({ professionalId: professional.id, patientId });

    // Most patients signed the RGPD consent; every 6th one did not
    const signed = i % 6 !== 5;
    await db.insert(rgpdConsents).values(signed
      ? { patientId, signed, signatureData: 'dev_seed', signedAt: at(-130, '10:00') }
      : { patientId, signed });

    const type = types[i % types.length];
    const pastCount = [6, 4, 3, 2, 1, 0, 5, 2, 3, 1][i % 10];
    const futureCount = signed ? [1, 0, 2, 0, 1][i % 5] : 0;
    const planned = [
      ...slots.past.splice(0, pastCount).map((startAt, n) => ({
        startAt,
        // Mostly completed, with some no-shows and cancellations
        status: n % 7 === 3 ? 'no_show' as const : n % 5 === 4 ? 'cancelled' as const : 'completed' as const,
      })),
      ...slots.future.splice(0, futureCount).map((startAt) => ({ startAt, status: 'scheduled' as const })),
    ];
    if (planned.length) {
      await db.insert(appointments).values(planned.map(({ startAt, status }) => ({
        professionalId: professional.id,
        patientId,
        appointmentTypeId: type.id,
        startAt,
        endAt: new Date(startAt.getTime() + type.durationMinutes * 60_000),
        status,
        price: type.price,
      })));
    }

    // Every other patient has a 10-session bono with 0 to 9 sessions already used
    if (i % 2 === 0) {
      await db.insert(bonos).values({
        professionalId: professional.id,
        patientId,
        appointmentTypeId: type.id,
        name: `Bono 10 sesiones ${type.name}`,
        price: (Number(type.price) * 9).toFixed(2),
        totalSessions: 10,
        sessionsUsed: randomInt(0, 9),
      });
    }

    const login = { role: 'Paciente', name: fullName, email, detail: professionalName };
    (hasAccount ? logins : withoutAccount).push(login);
  }
}

/** Same path as the public sign-up, so the auth hook creates the patient profile. */
async function signUpPatient({ email, firstName, lastName, phone }: { email: string; firstName: string; lastName: string; phone: string }) {
  const { user } = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name: `${firstName} ${lastName}`, firstName, lastName, phone },
  });
  const [profile] = await db.select({ id: patients.id }).from(patients).where(eq(patients.authUserId, user.id));
  if (!profile) throw new Error(`Patient profile was not created for ${email}`);
  return profile.id;
}

function writeCredentials(logins: Login[], withoutAccount: Login[]) {
  const row = (l: Login) => `| ${l.role} | ${l.name} | ${l.email} | ${l.detail} |`;
  const content = [
    '# Usuarios de prueba (solo local)',
    '',
    `Generado por \`pnpm --filter @fisio-app/backend db:seed\` el ${new Date().toLocaleString('es-ES')}. No subir a git.`,
    '',
    `Contraseña de todos: \`${PASSWORD}\``,
    '',
    '| Rol | Nombre | Email | Profesional / pacientes |',
    '|---|---|---|---|',
    ...logins.map(row),
    '',
    '## Pacientes sin cuenta (creados por el profesional, no pueden iniciar sesión)',
    '',
    '| Rol | Nombre | Email | Profesional |',
    '|---|---|---|---|',
    ...withoutAccount.map(row),
    '',
  ].join('\n');
  writeFileSync(CREDENTIALS_FILE, content);
}

await resetDb();
const logins: Login[] = [];
const withoutAccount: Login[] = [];
for (const [index, professional] of PROFESSIONALS.entries()) {
  await seedProfessional(professional, index, logins, withoutAccount);
}
writeCredentials(logins, withoutAccount);
console.log(`Seeded ${PROFESSIONALS.length} professionals and ${logins.length + withoutAccount.length - PROFESSIONALS.length} patients. Logins in docs/dev-users.md`);
await db.$client.end();
