# Auth Spec

## Surface under test

- `/patient/welcome` — unauthenticated hero + auth card; redirects to `/patient/dashboard` if session present
- `/patient/dashboard` — guarded: redirects to `/patient/welcome` if no session
- `SignupModal` — visible from AuthCard "Crear Cuenta Nueva" button
- `LoginModal` — visible from AuthCard "Iniciar Sesión" button
- `PatientTopBar` — shows full name, provides sign-out button

Backend endpoints used by the UI (indirectly):
- `POST /api/auth/sign-up/email` — better-auth sign-up
- `POST /api/auth/sign-in/email` — better-auth sign-in
- `GET /api/auth/get-session` — session check (via `authClient.getSession()`)

## Test files

| File | Tests |
|---|---|
| `tests/auth.signup.spec.ts` | Sign-up form → dashboard redirect; PatientTopBar shows name; profile API accessible after sign-up |
| `tests/auth.signin-signout.spec.ts` | Sign in → dashboard; sign out → welcome; post-signout nav bounces to welcome; invalid password error |
| `tests/auth.guards.spec.ts` | Unauthed → welcome redirect; authed → dashboard redirect |

## Fixtures required

- `resetDb` — truncates all tables before each test
- `seedProfessional` — creates professional user + appointment types + working schedules (needed for dashboard loader)
- `seedPatient` — creates patient user with known email/password
- `authedPatient` — seeds prof + patient + installs session cookies in browser context

## Key assertions

### Sign-up

1. `POST /api/auth/sign-up/email` returns 200 (implicit in redirect)
2. After sign-up + auto sign-in, URL → `/patient/dashboard`
3. `PatientTopBar` displays `{firstName} {lastName}` (from `patientProfileQueryOptions`)
4. `GET /api/v1/patient/me` returns 200 with valid session (role=patient, profile row created by hook)

### Sign-in

1. Correct credentials: URL → `/patient/dashboard`
2. Incorrect credentials: error text `"Error al iniciar sesión"` visible

### Sign-out

1. Clicking logout button (`Salir` / `aria-label="Cerrar sesión"`) in PatientTopBar navigates to `/patient/welcome`
2. Subsequent navigation to `/patient/dashboard` bounces back to `/patient/welcome`

### Route guards

1. `goto('/patient/dashboard')` without session → `/patient/welcome`
2. `goto('/patient/welcome')` with valid session → `/patient/dashboard`

## Open questions / follow-ups

- The "Forgot password" link points to `/forgot-password` which is not registered in the router. This is known and out of scope.
- Professional login at `/professional/login` is out of scope.
