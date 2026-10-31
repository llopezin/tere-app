# API Endpoints

> Complete endpoint reference for the physiotherapy clinic management app.
> Organised by domain. Each endpoint specifies method, path, auth, parameters, and business-logic notes.
> Derived from PRD.md and EXTENDED_DATA_MODEL.md.

---

## Conventions

| Item | Convention |
|------|-----------|
| Base URL | `/api/v1` — all routes served by Hono |
| Auth | All endpoints require a valid JWT via `Authorization: Bearer <token>` unless marked **public** |
| Roles | `professional` or `patient` — derived from JWT claims |
| IDs | UUID v4 |
| Dates | ISO 8601 (`2026-03-23T10:00:00Z`) |
| Money | Number with 2 decimal places (EUR) |
| Pagination | `?page=1&per_page=20` — default 20, max 100 |
| Filtering | Query params: `?from=&to=` for date ranges |
| Implementation | **Drizzle query** = simple CRUD via Drizzle ORM. **Hono handler** = route with additional business logic. |

---

## 1. Auth

Custom auth endpoints implemented in Hono. JWT-based with bcrypt password hashing.

| Method | Path | Description | Role |
|--------|------|-------------|------|
| `POST` | `/auth/signup` | Register new user (professional or patient) | Public |
| `POST` | `/auth/login` | Email + password login | Public |
| `POST` | `/auth/logout` | Invalidate session | Any |
| `POST` | `/auth/refresh` | Refresh JWT token | Any |
| `POST` | `/auth/reset-password` | Send password reset email | Public |

---

## 2. Professional Profile

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/professionals/me` | Get current professional's profile | Professional | Drizzle query |
| `PUT` | `/professionals/me` | Update profile (name, business info, tax ID, address) | Professional | Drizzle query |

**Request body (PUT):**
```json
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "business_name": "string",
  "tax_id": "string",
  "address_street": "string",
  "address_postal": "string",
  "address_city": "string",
  "address_province": "string",
  "address_country": "string"
}
```

---

## 3. Patients

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/patients` | List professional's patients. Supports `?search=` by name/NIE | Professional | Drizzle query |
| `POST` | `/patients` | Create a new patient | Professional | Drizzle query |
| `GET` | `/patients/:id` | Get patient details | Professional | Drizzle query |
| `PUT` | `/patients/:id` | Update patient personal data | Professional | Drizzle query |
| `GET` | `/patients/:id/appointments` | Get all appointments for patient. Supports `?status=&from=&to=` | Professional | Drizzle query |
| `GET` | `/patients/:id/bonos` | Get patient's bonos. Supports `?status=active` | Professional | Drizzle query |
| `GET` | `/patients/:id/payments` | Get patient's payment history | Professional | Drizzle query |

**Request body (POST / PUT):**
```json
{
  "first_name": "string",
  "last_name": "string",
  "nie": "string",
  "phone": "string",
  "email": "string",
  "date_of_birth": "YYYY-MM-DD",
  "address_street": "string",
  "address_postal": "string",
  "address_city": "string",
  "address_province": "string",
  "address_country": "string",
  "contact_method": "email | sms | whatsapp",
  "clinical_notes": "string"
}
```

**Auth middleware:** All patient endpoints filtered by `professional_id` extracted from JWT claims.

---

## 4. Patient Profile (Patient-facing)

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/patient/me` | Get own profile | Patient | Drizzle query |
| `PUT` | `/patient/me` | Update own personal data + contact method | Patient | Drizzle query |
| `GET` | `/patient/me/appointments` | Get own past & upcoming appointments | Patient | Drizzle query |

---

## 5. Patient Billing Data

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/patients/:id/billing-data` | Get billing data override (or empty if none) | Professional, Patient (own) | Drizzle query |
| `PUT` | `/patients/:id/billing-data` | Create or update billing data override | Professional, Patient (own) | Drizzle query |

**Request body (PUT):**
```json
{
  "billing_name": "string",
  "tax_id": "string",
  "address_street": "string",
  "address_postal": "string",
  "address_city": "string",
  "address_province": "string",
  "address_country": "string"
}
```

---

## 6. RGPD Consent

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/patients/:id/rgpd-consent` | Get consent status | Professional, Patient (own) | Drizzle query |
| `POST` | `/patients/:id/rgpd-consent` | Submit signed consent | Patient | Hono handler |

**Request body (POST):**
```json
{
  "signature_data": "base64-encoded-image-or-svg-path",
  "signed": true
}
```

**Business logic:** Sets `signed = true`, `signed_at = now()`, captures `ip_address` from request.

---

## 7. Appointment Types

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/appointment-types` | List professional's appointment types. Patient can also see (for booking) | Professional, Patient | Drizzle query |
| `POST` | `/appointment-types` | Create a new appointment type | Professional | Drizzle query |
| `PUT` | `/appointment-types/:id` | Update name, price, or duration | Professional | Drizzle query |
| `DELETE` | `/appointment-types/:id` | Soft-delete (set `is_active = false`) | Professional | Drizzle query |

**Request body (POST / PUT):**
```json
{
  "name": "string",
  "duration_minutes": 60,
  "price": 50.00
}
```

---

## 8. Working Schedules

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/working-schedules` | Get all weekly schedule slots for the professional | Professional | Drizzle query |
| `PUT` | `/working-schedules` | Bulk replace all schedule slots (send full week) | Professional | Hono handler |

**Request body (PUT):**
```json
{
  "slots": [
    { "day_of_week": 0, "start_time": "09:00", "end_time": "14:00" },
    { "day_of_week": 0, "start_time": "16:00", "end_time": "20:00" },
    { "day_of_week": 1, "start_time": "09:00", "end_time": "14:00" }
  ]
}
```

**Business logic:** Deletes all existing slots for the professional and inserts the new set in a single transaction.

---

## 9. Blocked Times

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/blocked-times` | List blocked times. Supports `?from=&to=` | Professional | Drizzle query |
| `POST` | `/blocked-times` | Create a new blocked time range | Professional | Drizzle query |
| `DELETE` | `/blocked-times/:id` | Remove a blocked time | Professional | Drizzle query |

**Request body (POST):**
```json
{
  "start_at": "2026-03-25T09:00:00Z",
  "end_at": "2026-03-25T14:00:00Z",
  "reason": "Vacaciones"
}
```

---

## 10. Availability (Computed Slots)

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/availability` | Get available booking slots for a given professional and date range | Patient, Professional | Hono handler |

**Query params:**
```
?professional_id=UUID
&appointment_type_id=UUID
&from=2026-03-24
&to=2026-03-30
```

**Response:**
```json
{
  "slots": [
    { "start_at": "2026-03-24T09:00:00Z", "end_at": "2026-03-24T10:00:00Z" },
    { "start_at": "2026-03-24T10:00:00Z", "end_at": "2026-03-24T11:00:00Z" }
  ]
}
```

**Business logic:**
1. Fetch `working_schedules` for the professional and requested days.
2. Divide each schedule block into slots based on `appointment_types.duration_minutes`.
3. Subtract slots that overlap with existing `appointments` (status ≠ cancelled).
4. Subtract slots that overlap with `blocked_times`.
5. Return remaining available slots.

---

## 11. Appointments

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/appointments` | List appointments. Supports `?from=&to=&status=&patient_id=` | Professional | Drizzle query |
| `POST` | `/appointments` | Create single appointment | Professional, Patient | Hono handler |
| `POST` | `/appointments/batch` | Create multiple appointments for same patient (multi-slot) | Professional | Hono handler |
| `POST` | `/appointments/recurring` | Create recurring appointment series | Professional | Hono handler |
| `GET` | `/appointments/:id` | Get appointment details (includes patient, type, payment info) | Professional, Patient (own) | Drizzle query |
| `PUT` | `/appointments/:id` | Edit appointment (time, type, notes, price) | Professional | Hono handler |
| `PATCH` | `/appointments/:id/cancel` | Cancel appointment | Professional, Patient (own) | Hono handler |
| `PATCH` | `/appointments/:id/complete` | Mark as completed | Professional | Drizzle query |
| `PATCH` | `/appointments/:id/no-show` | Mark patient as no-show | Professional | Drizzle query |

**Request body — POST (single):**
```json
{
  "patient_id": "UUID",
  "appointment_type_id": "UUID",
  "start_at": "2026-03-25T10:00:00Z",
  "notes": "Dolor lumbar",
  "bono_id": "UUID | null",
  "use_bono_session": true
}
```
`end_at` is computed from `appointment_type.duration_minutes`. `price` is copied from `appointment_type.price`.

**Request body — POST /batch:**
```json
{
  "patient_id": "UUID",
  "appointment_type_id": "UUID",
  "slots": [
    { "start_at": "2026-03-25T10:00:00Z" },
    { "start_at": "2026-03-25T11:00:00Z" }
  ],
  "bono_id": "UUID | null",
  "use_bono_session": true
}
```

**Request body — POST /recurring:**
```json
{
  "patient_id": "UUID",
  "appointment_type_id": "UUID",
  "start_at": "2026-03-25T10:00:00Z",
  "recurrence_rule": {
    "frequency": "weekly",
    "interval": 1,
    "count": 8
  },
  "bono_id": "UUID | null",
  "use_bono_session": true
}
```

**Business logic (all creation endpoints):**
1. Verify `rgpd_consents.signed = true` for the patient.
2. Verify slot does not overlap with existing appointments or blocked times.
3. If `bono_id` provided and `use_bono_session = true`: deduct session from bono, create `bono_transaction`.
4. If Google Calendar connected: create calendar event and store `google_event_id`.
5. All created in a single DB transaction.

**Business logic (cancel):**
1. Verify `start_at` is in the future.
2. Set `status = 'cancelled'`.
3. If bono session was deducted: refund it (create `bono_transaction` type=refund, decrement `bonos.sessions_used`).
4. If Google Calendar event exists: delete it.

---

## 12. Bonos

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/bonos` | List bonos. Supports `?patient_id=&status=` | Professional | Drizzle query |
| `POST` | `/bonos` | Create a new bono for a patient | Professional | Drizzle query |
| `GET` | `/bonos/:id` | Get bono details (includes sessions_remaining) | Professional, Patient (own) | Drizzle query |
| `GET` | `/bonos/:id/transactions` | Get bono transaction history | Professional | Drizzle query |
| `POST` | `/bonos/:id/deduct` | Manually deduct a session (no appointment) | Professional | Hono handler |

**Request body — POST (create):**
```json
{
  "patient_id": "UUID",
  "appointment_type_id": "UUID",
  "name": "Bono 10 sesiones fisio",
  "price": 400.00,
  "total_sessions": 10
}
```

**Request body — POST /deduct:**
```json
{
  "note": "Sesión fuera de app"
}
```

**Business logic (deduct):**
1. Verify `sessions_used < total_sessions`.
2. Increment `bonos.sessions_used`.
3. Create `bono_transaction` with type `manual_deduction`.
4. If `sessions_used` reaches `total_sessions`, set `bonos.status = 'exhausted'`.
5. **Send notification to patient** via their preferred `contact_method`.

---

## 13. Payments

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/payments` | List payments. Supports `?from=&to=&patient_id=&payment_method=` | Professional | Drizzle query |
| `POST` | `/payments` | Record a payment | Professional | Drizzle query |
| `GET` | `/payments/:id` | Get payment details | Professional | Drizzle query |

**Request body (POST):**
```json
{
  "patient_id": "UUID",
  "appointment_id": "UUID | null",
  "bono_id": "UUID | null",
  "amount": 50.00,
  "payment_method": "card | bizum | cash",
  "paid_at": "2026-03-25T10:30:00Z",
  "notes": "string"
}
```

---

## 14. Revenue Reports

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/reports/revenue/monthly` | Monthly revenue total | Professional | Hono handler |
| `GET` | `/reports/revenue/quarterly` | Quarterly revenue total | Professional | Hono handler |
| `GET` | `/reports/revenue/by-method` | Revenue breakdown by payment method | Professional | Hono handler |

**Query params (all):**
```
?year=2026&month=3        (monthly + by-method)
?year=2026&quarter=1      (quarterly)
```

**Response — monthly:**
```json
{
  "year": 2026,
  "month": 3,
  "total": 4250.00,
  "payment_count": 85
}
```

**Response — by-method:**
```json
{
  "year": 2026,
  "month": 3,
  "total": 4250.00,
  "by_method": [
    { "method": "card", "total": 2000.00, "count": 40, "percentage": 47.06 },
    { "method": "bizum", "total": 1500.00, "count": 30, "percentage": 35.29 },
    { "method": "cash", "total": 750.00, "count": 15, "percentage": 17.65 }
  ]
}
```

**Response — quarterly:**
```json
{
  "year": 2026,
  "quarter": 1,
  "total": 12500.00,
  "by_month": [
    { "month": 1, "total": 4000.00 },
    { "month": 2, "total": 4250.00 },
    { "month": 3, "total": 4250.00 }
  ]
}
```

---

## 15. Invoices

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/invoices` | List invoices. Supports `?patient_id=&from=&to=` | Professional, Patient (own) | Drizzle query |
| `POST` | `/invoices` | Generate an invoice for an appointment | Professional, Patient (own) | Hono handler |
| `GET` | `/invoices/:id` | Get invoice details | Professional, Patient (own) | Drizzle query |
| `GET` | `/invoices/:id/pdf` | Download invoice as PDF | Professional, Patient (own) | Hono handler |

**Request body (POST):**
```json
{
  "appointment_id": "UUID",
  "payment_id": "UUID | null"
}
```

**Business logic (generate):**
1. Snapshot professional billing data from `professionals` table.
2. Snapshot patient billing data from `patient_billing_data` (if exists) or `patients` table.
3. Generate sequential `invoice_number` (e.g. "2026-0042").
4. Generate PDF and upload to file storage (local disk or S3-compatible).
5. Store `pdf_url` on the invoice record.

---

## 16. Google Calendar Integration

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `POST` | `/integrations/google-calendar/connect` | Start OAuth flow, store calendar ID | Professional | Hono handler |
| `DELETE` | `/integrations/google-calendar/disconnect` | Remove Google Calendar link | Professional | Hono handler |
| `POST` | `/integrations/google-calendar/sync` | Force full sync of upcoming appointments | Professional | Hono handler |

**Note:** Day-to-day sync happens automatically when appointments are created/edited/cancelled (see Appointment endpoints). This manual sync is for initial setup or error recovery.

---

## 17. Contact / Communication

| Method | Path | Description | Role | Impl |
|--------|------|-------------|------|------|
| `GET` | `/patients/:id/contact-link` | Get deep link for patient's preferred contact method | Professional | Hono handler |

**Response:**
```json
{
  "method": "whatsapp",
  "link": "https://wa.me/34612345678"
}
```

**Logic:** Based on `patients.contact_method`, returns:
- `whatsapp` → `https://wa.me/<phone>`
- `sms` → `sms:<phone>`
- `email` → `mailto:<email>`

---

## Endpoint Count Summary

| Domain | Endpoints |
|--------|-----------|
| Auth | 5 |
| Professional Profile | 2 |
| Patients | 7 |
| Patient Profile (patient-facing) | 3 |
| Billing Data | 2 |
| RGPD Consent | 2 |
| Appointment Types | 4 |
| Working Schedules | 2 |
| Blocked Times | 3 |
| Availability | 1 |
| Appointments | 9 |
| Bonos | 5 |
| Payments | 3 |
| Revenue Reports | 3 |
| Invoices | 4 |
| Google Calendar | 3 |
| Contact | 1 |
| **Total** | **59** |

---

## Implementation Split

| Type | Count | Description |
|------|-------|-------------|
| **Drizzle queries** | ~35 | Simple CRUD — Drizzle ORM handles query + serialization |
| **Hono handlers** | ~19 | Routes with business logic, computed results, external integrations |
| **Auth routes** | 5 | Custom JWT auth (signup, login, logout, refresh, reset) |
