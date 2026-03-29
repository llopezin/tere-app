Build Plan
Ordered, atomic tasks the agent should execute. Each task self-contained with acceptance criteria.

---

## Phase 1 — Project Scaffolding

### 1.1 Initialize monorepo
- Create `pnpm-workspace.yaml` at root
- Create `packages/backend/` directory structure
- Initialize root `package.json` with `"private": true`
- **AC:** `pnpm install` succeeds from root

### 1.2 Initialize backend package
- `packages/backend/package.json` with deps: `hono`, `@hono/node-server`, `drizzle-orm`, `drizzle-kit`, `pg` (postgres driver), `bcryptjs`, `jsonwebtoken`, `zod`, `dotenv`
- Dev deps: `vitest`, `typescript`, `tsx`, `@types/node`, `@types/bcryptjs`, `@types/jsonwebtoken`
- `tsconfig.json` with strict mode, ESM, path aliases
- **AC:** `pnpm --filter backend build` compiles without errors

### 1.3 Environment & configuration
- `.env.example` with: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`
- `src/config/env.ts` — loads and validates env vars with Zod
- **AC:** App fails fast with clear error if required env vars are missing

### 1.4 Entry point & health check
- `src/index.ts` — creates Hono app, mounts `/api/v1`, starts server
- `GET /api/v1/health` returns `{ status: "ok" }`
- **AC:** Server starts and responds to health check

---

## Phase 2 — Database Schema & Migrations

### 2.1 Drizzle config & connection
- `drizzle.config.ts` pointing to Postgres via `DATABASE_URL`
- `src/db/index.ts` — Drizzle client singleton
- **AC:** `drizzle-kit generate` runs without error

### 2.2 Schema — Core tables
- `src/db/schema/professionals.ts`
- `src/db/schema/patients.ts`
- `src/db/schema/patient-billing-data.ts`
- `src/db/schema/rgpd-consents.ts`
- All columns, constraints, defaults, indexes per EXTENDED_DATA_MODEL.md
- **AC:** Migration generated and can be applied to a clean DB

### 2.3 Schema — Scheduling tables
- `src/db/schema/appointment-types.ts`
- `src/db/schema/working-schedules.ts`
- `src/db/schema/blocked-times.ts`
- **AC:** Tables created with all constraints

### 2.4 Schema — Transactional tables
- `src/db/schema/appointments.ts`
- `src/db/schema/bonos.ts`
- `src/db/schema/bono-transactions.ts`
- `src/db/schema/payments.ts`
- `src/db/schema/invoices.ts`
- All FKs, indexes (professional_id + start_at, professional_id + paid_at)
- **AC:** Full schema applied, ER relationships match EXTENDED_DATA_MODEL.md

### 2.5 Schema — Auth table
- `src/db/schema/users.ts` — `id`, `email`, `password_hash`, `role` (professional|patient), `created_at`
- **AC:** Users table with unique email constraint

---

## Phase 3 — Auth System

### 3.1 Auth utilities
- `src/lib/password.ts` — bcrypt hash + compare
- `src/lib/jwt.ts` — sign, verify, refresh token logic
- **AC:** Unit tests pass for hash/compare and token sign/verify

### 3.2 Auth middleware
- `src/middleware/auth.ts` — extracts JWT from `Authorization: Bearer`, populates `c.set("user", ...)` with `userId`, `role`, `professionalId`/`patientId`
- `src/middleware/require-role.ts` — factory that rejects requests not matching required role
- **AC:** Protected routes return 401 without token, 403 with wrong role

### 3.3 Auth routes
- `POST /auth/signup` — create user + professional/patient record in transaction
- `POST /auth/login` — validate credentials, return access + refresh tokens
- `POST /auth/logout` — invalidate (client-side or token blacklist)
- `POST /auth/refresh` — issue new access token from refresh token
- `POST /auth/reset-password` — stub (send email placeholder)
- **AC:** Full signup → login → access protected route → refresh flow works

---

## Phase 4 — CRUD Endpoints (Drizzle Queries)

### 4.1 Professional profile
- `GET /professionals/me` + `PUT /professionals/me`
- Scoped to authenticated professional via JWT
- **AC:** Professional can read and update own profile

### 4.2 Patients
- `GET /patients` (list, search by name/NIE)
- `POST /patients` (create)
- `GET /patients/:id`, `PUT /patients/:id`
- `GET /patients/:id/appointments`, `/bonos`, `/payments`
- All filtered by `professional_id` from JWT
- **AC:** Full patient CRUD, search works, sub-resources return correct data

### 4.3 Patient profile (patient-facing)
- `GET /patient/me`, `PUT /patient/me`, `GET /patient/me/appointments`
- Scoped to authenticated patient
- **AC:** Patient can view/edit own data and see appointments

### 4.4 Patient billing data
- `GET /patients/:id/billing-data`, `PUT /patients/:id/billing-data`
- Accessible by professional (any patient) and patient (own only)
- **AC:** Billing data created/updated, used in invoice generation

### 4.5 RGPD consent
- `GET /patients/:id/rgpd-consent`
- `POST /patients/:id/rgpd-consent` — captures signature, IP, timestamp
- **AC:** Consent signed, appointment creation blocked without it

### 4.6 Appointment types
- Full CRUD: `GET`, `POST`, `PUT`, `DELETE` (soft delete → `is_active = false`)
- Filtered by `professional_id`
- **AC:** Types created, updated, soft-deleted, inactive filtered from patient view

### 4.7 Working schedules
- `GET /working-schedules` — list all slots
- `PUT /working-schedules` — bulk replace (delete all + insert in transaction)
- **AC:** Schedule fully replaced on PUT, returned on GET

### 4.8 Blocked times
- `GET /blocked-times` (with date range filter)
- `POST /blocked-times`, `DELETE /blocked-times/:id`
- **AC:** Blocked times created, listed, deleted

### 4.9 Payments
- `GET /payments` (filter by date, patient, method)
- `POST /payments`, `GET /payments/:id`
- **AC:** Payments recorded and queried

### 4.10 Bonos
- `GET /bonos` (filter by patient, status)
- `POST /bonos`, `GET /bonos/:id`
- `GET /bonos/:id/transactions`
- `POST /bonos/:id/deduct` — manual deduction with business logic
- **AC:** Bonos created, sessions deducted, transactions logged

---

## Phase 5 — Business Logic Endpoints (Hono Handlers)

### 5.1 Availability engine
- `GET /availability` — compute open slots from schedules minus appointments & blocked times
- Params: `professional_id`, `appointment_type_id`, `from`, `to`
- **AC:** Returns correct available slots, respects duration, blocks, and existing bookings

### 5.2 Appointment creation (single)
- `POST /appointments` — validates RGPD consent, overlap check, bono deduction, Google Calendar stub
- Wraps everything in a single DB transaction
- **AC:** Appointment created, bono deducted if applicable, overlaps rejected

### 5.3 Appointment creation (batch)
- `POST /appointments/batch` — same logic as single, for multiple slots
- **AC:** All slots validated + created atomically

### 5.4 Appointment creation (recurring)
- `POST /appointments/recurring` — expands recurrence rule into individual appointments
- Shares `recurrence_group_id`
- **AC:** Correct number of appointments created on correct dates

### 5.5 Appointment management
- `GET /appointments`, `GET /appointments/:id`
- `PUT /appointments/:id` — edit time, type, notes, price
- `PATCH /appointments/:id/cancel` — cancel + bono refund if applicable
- `PATCH /appointments/:id/complete`, `PATCH /appointments/:id/no-show`
- **AC:** All status transitions work, bono refund on cancel, future-only cancel enforced

### 5.6 Revenue reports
- `GET /reports/revenue/monthly` — total for given month
- `GET /reports/revenue/quarterly` — total per month in quarter
- `GET /reports/revenue/by-method` — breakdown by payment method
- **AC:** Reports return correct aggregated data

### 5.7 Invoice generation
- `POST /invoices` — snapshot billing data, generate sequential number, generate PDF
- `GET /invoices`, `GET /invoices/:id`, `GET /invoices/:id/pdf`
- **AC:** Invoice created with snapshots, PDF downloadable

### 5.8 Google Calendar integration (stubs)
- `POST /integrations/google-calendar/connect` — stub OAuth flow
- `DELETE /integrations/google-calendar/disconnect`
- `POST /integrations/google-calendar/sync`
- **AC:** Endpoints exist and return appropriate responses

### 5.9 Contact link
- `GET /patients/:id/contact-link` — returns deep link based on contact_method
- **AC:** Correct link format for whatsapp/sms/email

---

## Phase 6 — Validation & Error Handling

### 6.1 Zod request validation
- Zod schemas for every POST/PUT/PATCH body
- Middleware or per-route validation with clear error messages
- **AC:** Invalid requests return 400 with structured error response

### 6.2 Global error handler
- Catch-all error middleware returning consistent JSON errors
- Proper HTTP status codes (400, 401, 403, 404, 409, 500)
- **AC:** No unhandled errors leak stack traces

---

## Phase 7 — Testing

### 7.1 Unit tests
- Auth utils, availability engine, bono logic
- **AC:** `vitest run` passes

### 7.2 Integration tests
- API endpoint tests using Hono test client
- **AC:** Key flows (signup → create patient → book appointment → payment → invoice) tested end-to-end