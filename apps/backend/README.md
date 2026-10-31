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
| `CLIENT_APP_URL` | — | `FRONTEND_URL` or `http://localhost:5173` | client-app (patients) origin: CORS, Better Auth trusted origin, patient BFF Origin check |
| `PROFESSIONAL_APP_URL` | — | `http://localhost:5174` (dev/test only; **unset in production = professional-app disabled**) | professional-app origin: CORS, trusted origin, professional BFF Origin check, Google OAuth redirect target |
| `FRONTEND_URL` | — | — | **Deprecated**, fallback for `CLIENT_APP_URL` |

All variables are validated at startup via Zod (`src/config/env.ts`). The server will crash with a descriptive error if any required variable is missing or invalid.

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with hot-reload (tsx watch) |
| `pnpm build` | Compile TypeScript to `./dist` |
| `pnpm start` | Run compiled production server |
| `pnpm db:generate` | Generate Drizzle migration files from schema changes |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:push` | Push schema directly to database (dev shortcut, no migration files) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `pnpm test` | Run tests once (Vitest) |
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
└── drizzle/                         # SQL migrations
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

## Database Schema

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
- **`professional`** — created server-side only (and in the future, from the admin panel). Sign-up from professional-app is rejected.
  - Dev: `pnpm --filter @fisio-app/backend create-professional -- --email ana@clinica.es --password '…' --first-name Ana --last-name García`
  - Production image (no `tsx`): `docker compose exec backend node dist/scripts/create-professional.js --email … --password … --first-name … --last-name …`
- Signing in to client-app with a professional account, or to professional-app with a patient account, fails with the same `Invalid email or password` error as a wrong password (no account/role enumeration).

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
- Each **patient** only sees their own data.
- `patients.professional_id` and `patients.clinical_notes` are legacy columns (migrated to `professional_patients`), pending removal.

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
3. Run `pnpm db:push` (dev) or `pnpm db:generate && pnpm db:migrate` (production)

### CORS

Allowed origins are `CLIENT_APP_URL` and `PROFESSIONAL_APP_URL` (`src/app.ts`, `src/lib/auth.ts`).

### Error Handling

- Throw `AppError(statusCode, message)` for expected errors.
- Zod validation errors are automatically caught and returned as 400 with details.
- Unhandled errors return 500 with the message logged to console.
