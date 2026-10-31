# Appointments Spec

## Surface under test

- `/patient/dashboard` — "Reservar Cita" tab: `BookingForm` + `WeeklySchedule` + `BookingConfirmationModal`
- `/patient/dashboard` — "Mis Citas" tab: `AppointmentList` with "Próximas Citas" and "Historial" sub-tabs
- `PATCH /api/v1/appointments/{id}/cancel` — patient can cancel their own appointment (no UI button; API only)

## Test files

| File | Tests |
|---|---|
| `tests/appointments.book.spec.ts` | Booking flow with unsigned RGPD; RGPD checkbox enforced; success modal |
| `tests/appointments.book-already-consented.spec.ts` | RGPD checkbox absent for already-signed patient; single-step booking |
| `tests/appointments.list.spec.ts` | Upcoming tab shows future scheduled; history tab shows completed; counters (1)/(1) |
| `tests/appointments.cancel-api.spec.ts` | Cancel future appointment → 200 + status=cancelled; cancel past → 400; cancelled appears in history tab |

## Fixtures required

- `authedPatient` — seeds prof + patient (signRgpd=false) + installs session cookies
- `authedPatientWithRgpd` — seeds prof + patient (signRgpd=true) + installs session cookies
- `seedAppointmentsForPatient` — seeds prof + patient (signRgpd=true) + 1 future scheduled + 1 past completed + installs session cookies
- `seedBookableProfessional` — seeds professional with appointment types and Mon-Fri 09:00-18:00 working schedules

## Booking flow

### Preconditions

The `authedPatient` fixture:
1. Resets the database
2. Seeds a professional with `appointment_types` row ("Sesión estándar", 45 min, 50€)
3. Seeds `working_schedules` Mon–Fri 09:00–18:00
4. Seeds a patient (RGPD unsigned)
5. Signs in via API and installs cookies

### Booking steps (UI)

1. Navigate to `/patient/dashboard` (book tab is default)
2. Professional dropdown auto-selects the first (and only) professional
3. Select "Sesión estándar" from the consultation dropdown
4. `WeeklySchedule` queries `GET /availability` → renders time slot buttons for current week
5. Click a slot → `BookingConfirmationModal` opens
6. Modal pre-fills Name/Last/Phone/Email from patient profile
7. RGPD checkbox visible (patient has not signed)
8. Submit disabled until checkbox checked
9. After checking: fill NIE → submit
10. Modal transitions to "¡Cita confirmada!" with date/time/consultation/professional summary

### Key assertions

- Professional dropdown populated with "Ana García"
- Consultation dropdown shows "Sesión estándar"
- Slots visible for current week (working schedule Mon–Fri)
- Confirmation modal shows `title="Confirmar cita"`
- Form pre-filled (firstName="Carlos", lastName="López")
- Submit button disabled when `!alreadySigned && !rgpdAccepted`
- On submit: `POST /patient/me/rgpd-consent` then `POST /appointments` → 201
- Success state: heading "¡Cita confirmada!"; shows type "Sesión estándar" and professional "Ana García"

## Appointment list

### Preconditions

`seedAppointmentsForPatient` seeds:
- 1 future appointment (status=scheduled, startAt = next weekday 10:00)
- 1 past appointment (status=completed, startAt = last weekday 10:00)

### Key assertions

- "Próximas Citas" tab shows 1 card with "Programada" badge; counter (1)
- "Historial" tab shows 1 card with "Completada" badge; counter (1)
- Completed card shows "Factura" and "Editar Datos" buttons

## Cancel (API-only)

### Rationale

There is no patient-facing cancel button in `AppointmentCard.tsx`. Cancel UI is out of scope for MVP.
Tests call `PATCH /api/v1/appointments/{id}/cancel` directly via `page.evaluate` (uses browser session cookies).

### Key assertions

- Future appointment: 200 OK, `status=cancelled` in response body
- Past/completed appointment: 400 Bad Request
- After cancellation and dashboard navigation: appointment appears in "Historial" tab with "Cancelada" badge

## Known gaps / follow-ups

- No UI cancel button — when it's added, replace `appointments.cancel-api.spec.ts` with a UI test.
- `WeeklySchedule` uses live `new Date()` — tests run during weekdays or current-week slots must exist.
  If run on a weekend, the current week may show 0 slots; the test navigates to the following week if needed.
  Consider seeding blocked time logic or fixing seed to always pick a future weekday.
