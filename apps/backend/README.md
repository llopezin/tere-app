# @fisio-app/backend

Backend API for **Fisio App** — a physiotherapy clinic management system that lets professionals manage patients, appointments, payments, bonos (session packages), invoicing, and GDPR compliance.

Built with **Hono + Drizzle ORM + PostgreSQL + Better Auth + Zod**.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [NPM Scripts](#npm-scripts)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Business Logic](#business-logic)
- [Development Guide](#development-guide)

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9.15
- **PostgreSQL** ≥ 15 (local install or Docker)

### 1. Install dependencies

From the **monorepo root** (`fisio-app/`):

```bash
pnpm install
```

### 2. Set up PostgreSQL

If you don't have PostgreSQL running locally:

```bash
# macOS (Homebrew)
brew install postgresql@17
brew services start postgresql@17

# Create the database user and database
createuser -s user
psql -U $(whoami) -d postgres -c "ALTER USER \"user\" WITH PASSWORD 'password';"
createdb -U user fisio_app
```

### 3. Configure environment

Copy the example env file and adjust if needed:

```bash
cp .env.example .env
```

The defaults work out of the box for local development. See [Environment Variables](#environment-variables) for details.

### 4. Push the schema to the database

```bash
pnpm db:push
```

### 5. Start the dev server

```bash
pnpm dev
```

The API will be available at **http://localhost:3000**. Health check: `GET /api/v1/health`.

### 6. Access the API Documentation

The server provides interactive API documentation powered by Scalar:

- **Main API (v1)**: http://localhost:3000/api/v1/docs
  - All business endpoints: appointments, patients, payments, invoices, etc.
  
- **Auth API**: http://localhost:3000/api/auth/docs
  - Better Auth endpoints: sign-up, sign-in, sign-out, session management, password reset

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string, e.g. `postgres://user:password@localhost:5432/fisio_app` |
| `BETTER_AUTH_SECRET` | ✅ | — | Session encryption key (min 32 characters). Generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | — | `http://localhost:3000` | Base URL of the backend (used by Better Auth for callbacks) |
| `PORT` | — | `3000` | Server listening port |
| `NODE_ENV` | — | `development` | `development`, `production`, or `test` |
| `CLIENT_APP_URL` | — | `http://localhost:5173` | client-app (patients) origin: CORS, Better Auth trusted origin, patient BFF Origin check |
| `PROFESSIONAL_APP_URL` | — | `http://localhost:5174` (dev/test only; **unset in production = professional-app disabled**) | professional-app origin: CORS, trusted origin, professional BFF Origin check, Google OAuth redirect target |

All variables are validated at startup via Zod (`src/config/env.ts`). The server will crash with a descriptive error if any required variable is missing or invalid.

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with hot-reload (tsx watch) |
| `pnpm build` | Compile TypeScript to `./dist` |
| `pnpm lint` | Lint with oxlint |
| `pnpm typecheck` | Type-aware lint + type check (oxlint + tsgolint; build `@fisio-app/validators` first) |
| `pnpm start` | Run compiled production server |
| `pnpm db:push` | Sync the dev database in `.env` with the schema in `src/db/schema/` (while iterating) |
| `pnpm db:generate` | Write the migration for the current schema changes to `drizzle/` (once the change is ready, commit it with the code) |
| `pnpm db:push:test` | Same for the test database in `.env.test` (`--force`: test data is disposable) |
| `pnpm db:push:e2e` | Same for the e2e database in `.env.e2e` (run by `pnpm test:e2e` from the repo root) |
| `pnpm db:migrate:test` / `db:migrate:e2e` | Apply the migrations to an empty test / e2e database (what CI does) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `pnpm test` | Run tests once (Vitest). Concurrent runs queue on a Postgres advisory lock because they share the test DB |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm create-professional -- --email … --password … --first-name … --last-name …` | Create a professional account (public sign-up only creates patients) |

---

## Project Structure

```
apps/backend/
├── src/
│   ├── app.ts                       # Middleware + BFF mounting, exports PatientAppType / ProfessionalAppType
│   ├── index.ts                     # Server entry
│   ├── config/env.ts                # Zod env validation
│   ├── db/schema/                   # Drizzle tables (professional-patients.ts = N:M patient ↔ professional)
│   ├── lib/auth.ts                  # Better Auth config: role lock, cross-app sign-in guard, profile hooks
│   ├── middleware/
│   │   ├── auth.ts                  # authMiddleware, requireRole, requireOrigin, getProfileId
│   │   └── error-handler.ts         # AppError
│   ├── services/
│   │   ├── ownership.service.ts     # assert*Of helpers: every foreign id goes through them
│   │   ├── professional-account.service.ts
│   │   └── ...                      # appointment, availability, invoice, google-calendar
│   ├── scripts/create-professional.ts
│   └── routes/
│       ├── patient/                 # /api/v1/patient/*      → client-app only (role patient)
│       │   ├── patient.index.ts     # guard: requireOrigin(CLIENT_APP_URL) + auth + requireRole('patient')
│       │   └── me/ booking/ appointments/ bonos/ invoices/
│       ├── professional/            # /api/v1/professional/* → professional-app only (role professional)
│       │   ├── professional.index.ts
│       │   └── me/ patients/ appointment-types/ working-schedules/ blocked-times/ availability/
│       │       appointments/ bonos/ payments/ reports/ invoices/ consent-documents/ integrations/
│       └── public/                  # /api/v1/health, Google OAuth callback
├── src/migrate.ts                   # Applies pending migrations (container start, db:migrate:*)
└── drizzle/                         # Migrations (SQL + snapshots), generated by db:generate
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | ≥ 18 |
| Framework | [Hono](https://hono.dev) | 4.7 |
| ORM | [Drizzle ORM](https://orm.drizzle.team) | 0.41 |
| Database | PostgreSQL | ≥ 15 |
| Auth | [Better Auth](https://www.better-auth.com) | 1.2 |
| Validation | [Zod](https://zod.dev) | 3.24 |
| Testing | [Vitest](https://vitest.dev) | 3.0 |
| Language | TypeScript | 5.7 |

---

## End-to-end tests

Playwright specs live in `tests/` at the repo root and cover the patient flows of client-app. Run them from the root with `pnpm test:e2e`: it pushes the schema to the e2e DB (CI builds it with the migrations first), then Playwright boots its own backend and client-app.

- **Own stack** (`apps/backend/.env.e2e`): database `fisio_app_e2e`, backend on `:3100`, client-app on `:5175`. It never touches the dev DB or `fisio_app_test`, so it can run alongside `pnpm dev` and the Vitest suite.
- **Never reuses a running server** (`reuseExistingServer: false`). If `:3100` or `:5175` is busy (another e2e run), Playwright fails at start.
- **One-time local setup:** `createdb -U user fisio_app_e2e` and `pnpm exec playwright install chromium`.
- The Claude Code Stop hook (`.claude/hooks/verify-before-stop.sh`) runs `test:e2e` too, so that setup is needed before working with agents.

## Database Schema

`src/db/schema/` is the source of truth. Locally the schema is pushed; deployed databases only change through migrations in `drizzle/`.

- **Local, while iterating:** `pnpm db:push` (dev DB) and `pnpm db:push:test` (test DB; for a new one, `createdb -U user fisio_app_test` first). No files are written, change the schema as often as needed.
- **Change ready:** `pnpm db:generate` writes `drizzle/NNNN_*.sql` and commit it with the code. It diffs the schema against the last snapshot in `drizzle/meta`, not against your DB, so pushing before does not matter. Read the SQL: a renamed column is generated as drop + add unless you answer the rename prompt, and adding a `NOT NULL` column to a table with rows needs a default or a backfill written by hand.
- **CI:**
  - fails if `db:generate` creates a file, which means a schema change has no migration;
  - builds the empty test and e2e DBs with the migrations (`db:migrate:test`, `db:migrate:e2e`), so a broken migration fails before deploy.
- **Deployed container:** `node dist/migrate.js` applies the pending migrations, then the server starts. If a migration fails, the server does not start.
- **History:** `0000_baseline.sql` is the whole schema at the time migrations were restarted (the previous history was dropped while the app was in development). A database created with `push` cannot be migrated, since the baseline would try to create tables that already exist; deployed DBs are always created with migrations.

### Entity Relationship Overview

```
user ──< session
  │  ──< account
  │  ──< verification
  │
  ├── professional (1:1 via authUserId)
  │     ├──< appointment_types
  │     ├──< working_schedules
  │     ├──< blocked_times
  │     ├──< appointments
  │     ├──< bonos
  │     ├──< payments
  │     └──< invoices
  │
  └── patient (1:1 via authUserId, optional)
        ├── patient_billing_data (1:1)
        ├── rgpd_consents (1:1)
        ├──< appointments
        ├──< bonos
        ├──< payments
        └──< invoices
```

### Key Tables

| Table | Description |
|-------|-------------|
| `user` | Core auth user (Better Auth). Has `role` (`professional` or `patient`) and optional `profileId` |
| `professionals` | Clinic staff — business name, tax ID, address, Google Calendar link |
| `patients` | Patient records — contact info, clinical notes, preferred contact method |
| `appointment_types` | Service catalog — name, duration (min), price. Unique per professional |
| `appointments` | Bookings — status: `scheduled`, `completed`, `cancelled`, `no_show` |
| `working_schedules` | Weekly availability slots — day of week (0–6), start/end times |
| `blocked_times` | Time-off or unavailability periods |
| `bonos` | Session packages — total sessions, sessions used, status: `active`/`exhausted` |
| `bono_transactions` | Audit log — `deduction`, `refund`, `manual_deduction` |
| `payments` | Transactions — method: `card`, `bizum`, `cash`; status: `pending`, `paid` |
| `invoices` | Tax invoices — auto-numbered `YYYY-0001`, includes billing snapshots |
| `rgpd_consents` | GDPR consent — signature data, IP, timestamp |
| `patient_billing_data` | Billing address/tax ID override for invoicing |

---

## API Documentation

The backend provides **interactive API documentation** powered by [Scalar](https://scalar.com/). Documentation is automatically generated from the OpenAPI specifications and includes request/response examples with the ability to test endpoints directly.

### Documentation URLs

| Documentation | URL | Description |
|--------------|-----|-------------|
| **Main API (v1)** | http://localhost:3000/api/v1/docs | Complete business API including appointments, patients, payments, invoices, bonos, reports, and more |
| **Auth API** | http://localhost:3000/api/auth/docs | Better Auth endpoints for user registration, login, logout, session management, and password reset |

### OpenAPI Spec URLs

Raw OpenAPI JSON specifications are also available:

- **Main API**: http://localhost:3000/api/v1/openapi.json
- **Auth API**: http://localhost:3000/api/auth/open-api/generate-schema

These can be imported into tools like Postman, Insomnia, or used for client code generation.

---

## Authentication

Authentication is handled by **Better Auth** with email/password login (`/api/auth/*`, shared by both apps).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up/email` | Register a **patient** (only from client-app) |
| POST | `/api/auth/sign-in/email` | Log in (each app only accepts its own role) |
| POST | `/api/auth/sign-out` | Log out |
| GET | `/api/auth/get-session` | Get current session |

### Roles

- **`patient`** — the only role public sign-up can create. `role` has `input: false`: if a client sends it, it is replaced by the default.
- **`professional`** — created server-side only (and in the future, from the admin panel). professional-app has no sign-up page, and a sign-up request from any origin still creates a patient.
  - Dev: `pnpm --filter @fisio-app/backend create-professional -- --email ana@clinica.es --password '…' --first-name Ana --last-name García`
  - Production image (no `tsx`): `docker compose exec backend node dist/scripts/create-professional.js --email … --password … --first-name … --last-name …`
- Signing in to client-app with a professional account, or to professional-app with a patient account, fails with the same `Invalid email or password` error as a wrong password (no account/role enumeration).

Roles are defined once in [`src/lib/roles.ts`](src/lib/roles.ts) (`ROLES`, type `Role`, `isRole`). They are backend-only: each frontend only knows its own role. To add a role:

1. Add it to `ROLES`.
2. Fix the TypeScript errors this creates. `createProfileByRole` in `src/lib/auth.ts` is a `Record<Role, …>`, so it will ask which profile (if any) the new role gets on sign-up.
3. Decide which BFF accepts it: `requireRole(ROLES.x)` in `routes/<bff>/<bff>.index.ts`, or a new BFF with its own `requireOrigin`.

### Session Handling

- Sessions last **7 days** and refresh every **24 hours**, cookie-based with a 5-minute cookie cache.

---

## API Endpoints (BFF)

The API is split in one **Backend For Frontend** per app. Each BFF router applies, once, for all its routes:

1. `requireOrigin(<app url>)` — a browser request from another app's origin gets **403** (requests without `Origin` pass; this is defense in depth).
2. `authMiddleware` — **401** without session.
3. `requireRole(...)` — **403** for the other role.

Inside the handlers, every query is scoped to the authenticated profile (`getProfileId`) and every foreign id in params/query/body is validated with `services/ownership.service.ts` (**404** when it isn't yours, so ids can't be probed).

Interactive docs: `/api/v1/docs` (tags `Patient / …`, `Professional / …`, `Public / …`).

### Public — `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/integrations/google-calendar/callback` | Google OAuth callback (URL registered in Google Cloud Console). Redirects to `PROFESSIONAL_APP_URL/ajustes/integraciones?gcal=…` |

### Patient BFF — `/api/v1/patient` (client-app)

| Method | Path | Scope |
|--------|------|-------|
| GET, PUT | `/me` | own profile (never clinical notes) |
| GET, PUT | `/me/billing-data` | own |
| GET, POST | `/me/rgpd-consent` | own |
| GET | `/consents`, `/consents/:consentId` · POST `/consents/:consentId/sign` | own |
| GET | `/professionals` | public fields only (`id`, names, `businessName`) |
| GET | `/professionals/:professionalId/appointment-types` | active types of that professional |
| GET | `/availability?professional_id&appointment_type_id&from&to` | type must be an active one of that professional |
| GET, POST | `/appointments` | own; `patientId` always comes from the session; booking links the patient to the professional |
| GET | `/appointments/:id` · PATCH `/appointments/:id/cancel` | own |
| GET | `/bonos/:id` | own |
| GET | `/invoices`, `/invoices/:id`, `/invoices/:id/pdf` | own (patients cannot create invoices) |

### Professional BFF — `/api/v1/professional` (professional-app)

| Module | Endpoints | Scope / validation |
|--------|-----------|--------------------|
| me | GET, PUT `/me` | own profile |
| patients | GET, POST `/patients` · GET, PUT `/patients/:id` | patients linked in `professional_patients`; `clinicalNotes` are per professional; personal data of patients with an account is read-only (403) |
| patients | GET `/patients/:id/{appointments,bonos,payments,consents}` | linked patient + only this professional's records |
| patients | GET, PUT `/patients/:id/billing-data` · GET, POST `/patients/:id/rgpd-consent` · GET `/patients/:id/contact-link` · POST `/patients/:id/consents` | linked patient (+ own consent document) |
| appointment-types | CRUD `/appointment-types` | own |
| working-schedules | GET, PUT `/working-schedules` | own |
| blocked-times | GET, POST, DELETE `/blocked-times` | own |
| availability | GET `/availability?appointment_type_id&from&to` | own agenda + own type |
| appointments | GET, POST `/appointments` · POST `/appointments/batch`, `/appointments/recurring` | own; `patientId`, `appointmentTypeId`, `bonoId` must be own |
| appointments | GET, PUT `/appointments/:id` · PATCH `/:id/cancel`, `/:id/complete`, `/:id/no-show` | own (+ own type on update) |
| bonos | GET, POST `/bonos` · GET `/bonos/:id`, `/bonos/:id/transactions` · POST `/bonos/:id/deduct` | own; patient and type must be own |
| payments | GET, POST `/payments` · GET `/payments/:id` | own; patient, appointment and bono must be own |
| invoices | GET, POST `/invoices` · GET `/invoices/:id`, `/invoices/:id/pdf` | own; appointment and payment must be own |
| reports | GET `/reports/revenue/{monthly,quarterly,by-method}` | own |
| consent-documents | CRUD `/consent-documents` | own |
| integrations | GET `/integrations/google-calendar/status` · POST `.../connect`, `.../disconnect` | own |

---

## Business Logic

### Multi-tenancy

- Patients and professionals are **N:M** (`professional_patients`). A patient becomes "of" a professional when the professional creates them or when the patient books with that professional.
- Each **professional** only sees their linked patients and only their own appointments, bonos, payments, invoices and clinical notes about them.
- Each **patient** only sees their own data. Clinical notes live in `professional_patients` (one per professional) and are never exposed to the patient.

### Appointment Booking Flow

1. **GDPR consent check** — patient must have signed consent before booking.
2. **Availability check** — validates against working schedule, existing appointments, and blocked times.
3. **Bono deduction** — if a bono is linked, a session is automatically deducted.
4. **Recurring appointments** — creates a weekly series sharing a `recurrence_group_id`.

### Bono Lifecycle

- Created with `total_sessions` and a price.
- Each linked appointment auto-deducts a session via `bono_transactions`.
- Cancelling an appointment auto-refunds the bono session.
- Manual deductions are supported.
- Status transitions to `exhausted` when `sessions_used >= total_sessions`.

### Invoicing

- Auto-numbered per professional per year: `YYYY-0001`, `YYYY-0002`, etc.
- Captures **snapshots** of professional and patient billing data at time of creation.
- PDF generation is currently stubbed (returns HTML fallback).

### GDPR (RGPD) Compliance

- Each patient has a consent record created automatically when the patient is created.
- Consent includes: signature data (base64), signing IP address, and timestamp.
- Appointments cannot be booked until consent is signed.

---

## Development Guide

### Adding a new route

1. Create `routes/<patient|professional>/<module>/<module>.{routes,handlers,index}.ts` (no per-route auth middleware: the BFF router applies it)
2. Scope queries with `getProfileId(c)` and validate foreign ids with `services/ownership.service.ts`
3. Mount the module in `routes/<bff>/<bff>.index.ts`
4. Add cases to `src/__tests__/authorization.test.ts`

### Adding a new table

1. Create schema file in `src/db/schema/your-table.ts`
2. Export from `src/db/schema/index.ts`
3. Run `pnpm db:push` (dev DB) and `pnpm db:push:test` (test DB) while iterating
4. Run `pnpm db:generate` and commit the new file in `drizzle/` with the code. The deployed container applies it on start

### CORS

Allowed origins are `CLIENT_APP_URL` and `PROFESSIONAL_APP_URL` (`src/app.ts`, `src/lib/auth.ts`).

### Error Handling

- Throw `AppError(statusCode, message)` for expected errors.
- Zod validation errors are automatically caught and returned as 400 with details.
- Unhandled errors return 500 with the message logged to console.
