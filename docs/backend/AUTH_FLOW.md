# Auth Flow

## Stack
**Better Auth** handles all authentication. It owns the `user`, `session`, `account`, and `verification` tables.

---

## Registration

```
Client → POST /api/auth/sign-up/email
         { name, email, password, role: "professional" | "patient" }
```

1. Better Auth creates a row in `user` (with `role` and `profileId` as custom fields).
2. A `databaseHook` fires **after** user creation:
   - `role === "professional"` → inserts into `professionals`, then sets `user.profileId = professional.id`
   - `role === "patient"` → inserts into `patients`, then sets `user.profileId = patient.id`
3. Better Auth creates a `session` and returns a session cookie.

**Key file:** `src/lib/auth.ts` → `databaseHooks.user.create.after`

---

## Login

```
Client → POST /api/auth/sign-in/email
         { email, password }
```

Better Auth verifies credentials against the `account` table (hashed password stored there), creates a `session` row, and sets a `Set-Cookie` header.

**Key file:** `src/lib/auth.ts` → `emailAndPassword: { enabled: true }`

---

## Session Validation (per request)

```
Client → Any protected route (cookie or Bearer token)
```

1. `authMiddleware` calls `auth.api.getSession({ headers })`.
2. Better Auth looks up the session token in the `session` table.
3. Returns `{ user, session }` or `null`.
4. Middleware attaches `user` and `session` to the Hono context (`c.set`).

**Key files:**
- `src/middleware/auth.ts` → `authMiddleware`, `requireRole()`, `getProfileId()`
- `src/lib/auth.ts` → session config (7-day expiry, 5-min cookie cache)

---

## Authorization

Two helpers in `src/middleware/auth.ts`:

| Helper | What it does |
|---|---|
| `requireRole('professional')` | Rejects if `user.role !== 'professional'` |
| `requireRole('patient')` | Rejects if `user.role !== 'patient'` |
| `getProfileId(c)` | Returns `user.profileId` (the `professionals.id` or `patients.id`) |

Routes use `getProfileId()` to scope all DB queries to the authenticated user's own data.

---

## Key Files

| File | Role |
|---|---|
| `src/lib/auth.ts` | Better Auth config, hooks, session settings |
| `src/middleware/auth.ts` | Per-request session check, role guards |
| `src/routes/auth.ts` | Mounts Better Auth handler at `/api/auth/*` |
| `src/db/schema/auth-schema.ts` | `user`, `session`, `account`, `verification` tables |

---

## Token / Cookie

Better Auth uses **HTTP-only cookies** by default. The session token is stored in the `session` table and cached client-side for 5 minutes (`cookieCache.maxAge = 300`). Sessions expire after **7 days**.
