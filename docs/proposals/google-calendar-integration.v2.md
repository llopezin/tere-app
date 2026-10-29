# Google Calendar Integration — Simplified Plan (v1)

**Status:** ready for implementation.
**Supersedes:** the previous v2 draft. Keep the scope deliberately tight — no read-from-Google, no webhooks, no watch channels, no busy-source fusion.

## Scope

Exactly two user-visible things:

1. **Professional side — write-only mirror.** When a patient creates an appointment in our app, push an event into the professional's Google Calendar. Same for update and cancel. No reads.
2. **Patient side — "Add to my calendar."** On each upcoming appointment card in the patient app, a button opens a popover with Google / Outlook / Apple / `.ics` options. All client-side URL builders / `.ics` blob. No patient OAuth.

Everything else is a non-goal.

## Non-goals

- No reading anything from Google (no freebusy, no watch channels, no webhooks, no busy-source fusion, no inbound sync).
- No two-way sync — edits made directly in Google do not flow back.
- No calendar selection — always write to `primary`.
- No login-with-Google. Sign-in remains email/password.
- No pause-without-disconnect toggle, no force-resync button, no per-professional configuration beyond connect/disconnect.
- No token encryption beyond Postgres defaults (Phase 2 concern).

## Professional side — write-only mirror

### OAuth

- Library: `google-auth-library` + `googleapis`. Not better-auth's Google provider.
- Scopes: `https://www.googleapis.com/auth/calendar.events` (narrowest that lets us create/update/delete events), plus `openid email` to capture the connected account email.
- Connect: backend generates an `authUrl` with `access_type=offline`, `prompt=consent`, signed state nonce in an HttpOnly cookie. Same-window redirect. On callback, exchange code, upsert the integration row, 302 to frontend.
- Disconnect: best-effort revoke against `https://oauth2.googleapis.com/revoke`, delete the integration row either way.

### Data model

One new table + reuse an existing column.

**`google_calendar_integrations`** — one row per professional:

```
id                          uuid PK
professional_id             uuid UNIQUE FK → professionals.id (cascade delete)
google_sub                  text         — stable Google user id (audit)
google_email                text         — display
access_token                text
refresh_token               text
access_token_expires_at     timestamptz
scope                       text
status                      text ('active' | 'revoked')
last_error                  text
last_error_at               timestamptz
last_synced_at              timestamptz
created_at / updated_at     timestamptz
```

**`appointments.googleEventId`** — already present at `apps/backend/src/db/schema/appointments.ts:23`. Reused as the link between our appointment and the Google event.

No queue table in v1. We try the Google call once inline after the DB commit; if it fails we log, set `last_error`, and move on. The professional can reconnect or the next booking will retry naturally. If we see enough failures in practice we add a queue in v1.1 — but the simple version first.

### API

All under `/api/v1/integrations/google`. Professional-only session auth (`requireRole('professional')`).

| Verb | Path | Purpose |
|---|---|---|
| GET  | `/status` | `{ connected, email, status, lastError, lastSyncedAt }`. |
| POST | `/connect` | `{ authUrl }`. Sets `gcal_oauth_state` cookie. |
| GET  | `/callback` | Exchanges code, upserts row, 302 to frontend. |
| POST | `/disconnect` | Revoke + delete. |

Replace the existing stubs in `apps/backend/src/routes/google-calendar/`.

### Sync model

**Fire-and-forget, after DB commit, no queue.**

In each appointment mutation handler in `apps/backend/src/routes/appointments/appointments.handlers.ts`:

```ts
const result = await db.transaction(async (tx) => { /* existing */ });
void gcalSyncService.push({ appointmentId: result.id, op: 'create' });  // non-blocking
return c.json(result, HttpStatusCodes.CREATED);
```

`gcalSyncService.push` is `async` and catches its own errors — a rejected promise never bubbles to the request. On failure it logs and writes `last_error` / `last_error_at` on the integration row.

Map:
- `create` / `batch` / `recurring` → `op: 'create'` (one call per appointment row)
- `update` → `op: 'update'` iff `startAt` / `appointmentTypeId` / `notes` changed and `googleEventId` exists
- `cancel` → `op: 'delete'` iff `googleEventId` exists
- `complete` / `noShow` → no-op

Idempotency: if `op=create` and the appointment already has a `googleEventId`, promote to `update`.

Every event we create sets `sendUpdates: 'none'` (no Google-side email to the patient) and stores our appointment id in `extendedProperties.private.fisioAppointmentId` (future-proof marker, no cost today).

### Token refresh

Lazy refresh-on-use inside `gcalClient.getForProfessional(profId)`: if `access_token_expires_at < now + 60s`, refresh first. On `invalid_grant` → `status='revoked'`, surface on `/status`, no further attempts until reconnect.

### Env

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/integrations/google/callback
GCAL_SYNC_ENABLED=false
```

All optional. When `GCAL_SYNC_ENABLED=false` or secrets are missing, the routes return `503 { message: 'Google Calendar integration not configured' }` and `gcalSyncService.push` is a no-op. CI / local dev stay green without Google credentials.

Dependencies to add: `googleapis` and `google-auth-library`.

## Patient side — "Add to my calendar"

No OAuth. Pure client-side URL and `.ics` builders.

| Provider | Mechanism |
|---|---|
| Google Calendar | `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...` — opens in new tab pre-filled |
| Outlook Web | `https://outlook.live.com/calendar/0/deeplink/compose?...` |
| Apple / generic | `.ics` blob (UTF-8, CRLF, `UID` = appointment id) downloaded via an object URL |

UX: "Añadir al calendario" button on each upcoming-appointment card in the patient dashboard. Button opens a popover with four options; one click per option. No confirmation screens from our app.

Files:
- `apps/client-app/src/lib/calendar-links.ts` — pure functions: `buildGoogleUrl`, `buildOutlookUrl`, `buildIcs`.
- `apps/client-app/src/routes/patient/dashboard/-components/AddToCalendarButton.tsx` — popover UI.
- `AppointmentCard.tsx` — render the button on scheduled future appointments.

## Professional-app UI

Minimal. A single page at `/ajustes/integraciones` (new) with one card for Google Calendar.

States:
- **Disconnected** — "Conectar Google Calendar" button.
- **Connecting** — spinner (ephemeral).
- **Connected** — shows email + "Desconectar" button.
- **Revoked** — "Google ha revocado el acceso" banner + "Reconectar" button.

No pause toggle, no pending-failures count, no re-sync button. If the integration fails, `last_error` is shown below the status line; the user's only recourse is disconnect → reconnect.

Files:
- `apps/professional-app/src/routes/ajustes/integraciones/index.tsx` — main page.
- `apps/professional-app/src/routes/ajustes/integraciones/oauth/callback.tsx` — loader-only OAuth landing.
- `apps/professional-app/src/api/gcalIntegration.ts` — query + mutation hooks.
- `apps/professional-app/src/components/IntegrationCard.tsx`.

## File-level plan

### Backend — new
- `src/db/schema/google-calendar-integrations.ts`
- `src/services/google-calendar/oauth-client.ts`
- `src/services/google-calendar/events.ts` — `createEvent`, `updateEvent`, `deleteEvent`
- `src/services/google-calendar/sync.ts` — `push({ appointmentId, op })`
- `src/services/google-calendar/event-mapper.ts` — appointment row → Google `Event` resource

### Backend — changed
- `src/config/env.ts` — new optional vars
- `src/db/schema/index.ts` — export new table
- `src/routes/google-calendar/` — replace stubs with the four endpoints above
- `src/routes/appointments/appointments.handlers.ts` — add `void gcalSyncService.push(...)` after commit in `create`, `batch`, `recurring`, `update`
- `src/services/appointment.service.ts` — `push(..., 'delete')` in `cancelAppointment`
- `.env.example`
- `drizzle/` — one migration

### Frontend (professional-app) — new
- `src/routes/ajustes/integraciones/index.tsx`
- `src/routes/ajustes/integraciones/oauth/callback.tsx`
- `src/components/IntegrationCard.tsx`
- `src/api/gcalIntegration.ts`

### Frontend (client-app) — new
- `src/lib/calendar-links.ts`
- `src/routes/patient/dashboard/-components/AddToCalendarButton.tsx`

### Frontend (client-app) — changed
- `AppointmentCard.tsx` — render the new button on scheduled future appointments

## What we explicitly skip

- `gcal_busy_blocks` table, watch channels, webhook endpoint, sync tokens, `freebusy.query`, busy-source fusion inside `availability.service.ts`, `/resync` endpoint, `PATCH /status` pause toggle, `gcal_sync_queue` retry table, setInterval worker.

All are real engineering; none are needed to satisfy the two goals above.
