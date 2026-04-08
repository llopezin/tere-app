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

---

## Project Structure

```
packages/backend/
├── src/
│   ├── index.ts                     # Server entry — middleware + route mounting
│   ├── config/
│   │   └── env.ts                   # Zod env validation
│   ├── db/
│   │   ├── index.ts                 # Drizzle ORM instance
│   │   └── schema/
│   │       ├── index.ts             # Re-exports all tables
│   │       ├── auth-schema.ts       # user, session, account, verification
│   │       ├── professionals.ts     # Professional profiles
│   │       ├── patients.ts          # Patient records
│   │       ├── patient-billing-data.ts
│   │       ├── rgpd-consents.ts     # GDPR consent signatures
│   │       ├── appointment-types.ts # Service catalog
│   │       ├── appointments.ts      # Bookings
│   │       ├── working-schedules.ts # Weekly availability
│   │       ├── blocked-times.ts     # Time-off / unavailability
│   │       ├── bonos.ts             # Session packages
│   │       ├── bono-transactions.ts # Bono audit log
│   │       ├── payments.ts          # Payment records
│   │       └── invoices.ts          # Tax invoices
│   ├── lib/
│   │   ├── auth.ts                  # Better Auth configuration + hooks
│   │   └── validators.ts           # Zod schemas for all endpoints
│   ├── middleware/
│   │   ├── auth.ts                  # authMiddleware, requireRole, getProfileId
│   │   └── error-handler.ts        # Global error handler + AppError class
│   └── routes/
│       ├── auth.ts                  # Better Auth passthrough
│       ├── professionals.ts         # Professional profile CRUD
│       ├── patients.ts              # Patient management (professional-facing)
│       ├── patient-profile.ts       # Patient self-service
│       ├── appointment-types.ts     # Service types CRUD
│       ├── working-schedules.ts     # Schedule management
│       ├── blocked-times.ts         # Time blocking
│       ├── availability.ts          # Slot calculation
│       ├── appointments.ts          # Booking management
│       ├── bonos.ts                 # Session packages
│       ├── payments.ts              # Payment recording
│       ├── reports.ts               # Revenue analytics
│       ├── invoices.ts              # Invoice generation
│       └── google-calendar.ts       # Google Calendar integration (stub)
├── drizzle.config.ts                # Drizzle Kit config
├── tsconfig.json                    # TypeScript config (ES2022, strict)
├── package.json
└── .env.example
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

Authentication is handled by **Better Auth** with email/password login.

### Endpoints (handled by Better Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up/email` | Register a new user |
| POST | `/api/auth/sign-in/email` | Log in |
| POST | `/api/auth/sign-out` | Log out |
| GET | `/api/auth/get-session` | Get current session |
| POST | `/api/auth/forget-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Roles

- **`professional`** — Manages patients, appointments, payments, invoices. A professional profile is auto-created on signup.
- **`patient`** (default) — Can view own appointments, billing data, and sign GDPR consent.

### Signup Example

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laura García",
    "email": "laura@example.com",
    "password": "securepassword123",
    "role": "professional"
  }'
```

### Session Handling

- Sessions last **7 days** and refresh every **24 hours**
- Cookie-based with **5-minute server-side cache** for performance
- Use the returned session cookie for authenticated requests

### Middleware

| Function | Usage |
|----------|-------|
| `authMiddleware` | Validates session, sets `user` and `session` on Hono context |
| `requireRole('professional')` | Restricts to specific role(s) |
| `getProfileId(c)` | Extracts professional UUID; throws 403 if not set |

---

## API Endpoints

All business endpoints are under `/api/v1` and require authentication.

### Health Check

```
GET /api/v1/health → { "status": "ok", "timestamp": "..." }
```

### Professionals

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/professionals/me` | professional | Get own profile |
| PUT | `/api/v1/professionals/me` | professional | Update profile |

### Patients (Professional-facing)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/patients` | professional | List patients (search, pagination) |
| POST | `/api/v1/patients` | professional | Create patient |
| GET | `/api/v1/patients/:id` | professional | Get patient details |
| PUT | `/api/v1/patients/:id` | professional | Update patient |
| GET | `/api/v1/patients/:id/appointments` | professional | Patient's appointments |
| GET | `/api/v1/patients/:id/bonos` | professional | Patient's bonos |
| GET | `/api/v1/patients/:id/payments` | professional | Patient's payments |
| GET | `/api/v1/patients/:id/billing-data` | professional | Billing data |
| PUT | `/api/v1/patients/:id/billing-data` | professional | Upsert billing data |
| GET | `/api/v1/patients/:id/rgpd-consent` | professional | GDPR consent status |
| POST | `/api/v1/patients/:id/rgpd-consent` | patient | Sign GDPR consent |
| GET | `/api/v1/patients/:id/contact-link` | professional | Generate contact link |

### Patient Profile (Patient-facing)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/patient/me` | patient | Own profile |
| PUT | `/api/v1/patient/me` | patient | Update own data |
| GET | `/api/v1/patient/me/appointments` | patient | Own appointments |
| GET | `/api/v1/patient/me/billing-data` | patient | Own billing data |
| PUT | `/api/v1/patient/me/billing-data` | patient | Update billing data |

### Appointment Types

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/appointment-types` | any | List types (professional: own; patient: filtered) |
| POST | `/api/v1/appointment-types` | professional | Create type |
| PUT | `/api/v1/appointment-types/:id` | professional | Update type |
| DELETE | `/api/v1/appointment-types/:id` | professional | Deactivate type |

### Working Schedules

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/working-schedules` | professional | List weekly slots |
| PUT | `/api/v1/working-schedules` | professional | Bulk replace all slots |

### Blocked Times

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/blocked-times` | professional | List (date range filter) |
| POST | `/api/v1/blocked-times` | professional | Create time block |
| DELETE | `/api/v1/blocked-times/:id` | professional | Remove block |

### Availability

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/availability` | any | Compute free slots for a professional + appointment type |

Query params: `professional_id`, `appointment_type_id`, `from`, `to`

### Appointments

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/appointments` | professional | List with filters |
| POST | `/api/v1/appointments` | professional | Create single appointment |
| POST | `/api/v1/appointments/batch` | professional | Create multiple |
| POST | `/api/v1/appointments/recurring` | professional | Create recurring series |
| GET | `/api/v1/appointments/:id` | any | Get details |
| PUT | `/api/v1/appointments/:id` | professional | Update |
| PATCH | `/api/v1/appointments/:id/cancel` | any | Cancel (refunds bono) |
| PATCH | `/api/v1/appointments/:id/complete` | professional | Mark completed |
| PATCH | `/api/v1/appointments/:id/no-show` | professional | Mark no-show |

### Bonos (Session Packages)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/bonos` | professional | List (filter by patient, status) |
| POST | `/api/v1/bonos` | professional | Create package |
| GET | `/api/v1/bonos/:id` | professional | Details + sessions remaining |
| GET | `/api/v1/bonos/:id/transactions` | professional | Deduction audit log |
| POST | `/api/v1/bonos/:id/deduct` | professional | Manual deduction |

### Payments

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/payments` | professional | List with filters |
| POST | `/api/v1/payments` | professional | Record payment |
| GET | `/api/v1/payments/:id` | professional | Payment details |

### Reports (Professional only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reports/revenue/monthly` | Monthly revenue total & count |
| GET | `/api/v1/reports/revenue/quarterly` | Quarterly breakdown by month |
| GET | `/api/v1/reports/revenue/by-method` | Revenue by payment method |

### Invoices

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/v1/invoices` | any | List (professional: issued; patient: received) |
| POST | `/api/v1/invoices` | professional | Generate from appointment |
| GET | `/api/v1/invoices/:id` | any | Invoice details |
| GET | `/api/v1/invoices/:id/pdf` | any | Download PDF |

### Google Calendar (Stub)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/integrations/google-calendar/connect` | Initiate OAuth |
| DELETE | `/api/v1/integrations/google-calendar/disconnect` | Revoke |
| POST | `/api/v1/integrations/google-calendar/sync` | Sync appointments |

---

## Business Logic

### Multi-tenancy

- Each **professional** only sees and manages their own patients, appointments, payments, and invoices.
- Each **patient** only sees their own data.

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

1. Create the route file in `src/routes/your-route.ts`
2. Add Zod validation schemas in `src/lib/validators.ts`
3. Mount the route in `src/index.ts`

### Adding a new table

1. Create schema file in `src/db/schema/your-table.ts`
2. Export from `src/db/schema/index.ts`
3. Run `pnpm db:push` (dev) or `pnpm db:generate && pnpm db:migrate` (production)

### CORS

The frontend origin is configured in `src/index.ts`. Currently set to `http://localhost:5173`.

### Error Handling

- Throw `AppError(statusCode, message)` for expected errors.
- Zod validation errors are automatically caught and returned as 400 with details.
- Unhandled errors return 500 with the message logged to console.
