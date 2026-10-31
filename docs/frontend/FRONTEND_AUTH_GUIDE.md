# Frontend Authentication Guide

How to implement auth in the React frontend using the Better Auth client SDK against the existing Fisio App backend.

---

## 1. How Auth Works (Backend Summary)

The backend uses [Better Auth](https://www.better-auth.com/) with email + password, cookie-based sessions, and two roles:

| Concept          | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Provider**     | Email & password (no OAuth for now)                                    |
| **Sessions**     | Server-side sessions stored in Postgres, exposed via a secure cookie   |
| **Session TTL**  | 7 days, refreshed every 24 hours automatically                        |
| **Cookie cache** | 5 minutes — the session cookie is self-contained for that window       |
| **Roles**        | `professional` or `patient` (set at signup, stored in `user.role`)     |
| **Profile link** | Each user has a `profileId` pointing to the `professionals` or `patients` table |
| **Auto-profile** | When a `professional` signs up, a professional profile row is auto-created |

### Auth Endpoints (served at `/api/auth/*`)

| Method | Path                         | Purpose                    |
|--------|------------------------------|----------------------------|
| POST   | `/api/auth/sign-up/email`    | Register a new account     |
| POST   | `/api/auth/sign-in/email`    | Log in                     |
| POST   | `/api/auth/sign-out`         | Log out (clear session)    |
| GET    | `/api/auth/get-session`      | Get current session + user |
| POST   | `/api/auth/forget-password`  | Request password reset     |
| POST   | `/api/auth/reset-password`   | Reset password with token  |

> All API routes under `/api/v1/*` require a valid session cookie. The backend returns `401` if missing/expired and `403` if the user's role is insufficient.

---

## 2. Install the Better Auth Client

```bash
pnpm add better-auth
```

Better Auth ships a framework-agnostic client and a React-specific integration.

---

## 3. Create the Auth Client

Create a file like `src/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // backend URL
});

// Destructure the hooks you need
export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
```

> **Production**: replace the `baseURL` with your production backend URL, or use an env variable like `import.meta.env.VITE_API_URL`.

### Why `better-auth/react`?

The `createAuthClient` from `better-auth/react` returns React hooks (`useSession`) alongside the imperative methods (`signIn`, `signUp`, `signOut`). If you want the plain client without hooks, import from `better-auth/client` instead.

---

## 4. Sign Up

```tsx
import { signUp } from "@/lib/auth-client";

async function handleSignUp(form: {
  name: string;
  email: string;
  password: string;
  role: "professional" | "patient";
}) {
  const { data, error } = await signUp.email({
    name: form.name,
    email: form.email,
    password: form.password,
    role: form.role, // custom field — sets the user role
  });

  if (error) {
    // error.message contains the reason (e.g. "Email already in use")
    console.error(error.message);
    return;
  }

  // data contains { user, session }
  // The session cookie is now set automatically
  // For professionals, a profile row was auto-created on the server
  // Redirect to dashboard
}
```

### What happens server-side on signup?

1. Better Auth creates rows in `user`, `session`, and `account`.
2. A `databaseHook` fires:
   - **Professional**: a row is inserted into `professionals` and `user.profileId` is set to the new professional's UUID.
   - **Patient**: a row is inserted into `patients` (with name and email from registration) and `user.profileId` is set to the new patient's UUID.
3. The session cookie is set — the user is immediately authenticated with their `profileId` ready to use.

---

## 5. Sign In

```tsx
import { signIn } from "@/lib/auth-client";

async function handleSignIn(email: string, password: string) {
  const { data, error } = await signIn.email({
    email,
    password,
  });

  if (error) {
    console.error(error.message);
    return;
  }

  // Session cookie set → user is now authenticated
  // data.user.role tells you "professional" or "patient"
  // Redirect based on role
}
```

---

## 6. Sign Out

```tsx
import { signOut } from "@/lib/auth-client";

async function handleSignOut() {
  await signOut();
  // Cookie cleared → redirect to login
}
```

---

## 7. Get Session (React Hook)

Use the `useSession` hook in any component to reactively access the current user and session:

```tsx
import { useSession } from "@/lib/auth-client";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error } = useSession();

  if (isPending) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" />;

  const { user } = session;

  return (
    <div>
      <p>Welcome, {user.name} ({user.role})</p>
      {children}
    </div>
  );
}
```

### Session shape

```ts
{
  user: {
    id: string;
    name: string;
    email: string;
    role: "professional" | "patient";
    profileId: string | null;  // UUID linking to professionals/patients table
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  };
  session: {
    id: string;
    token: string;
    expiresAt: string;
    userId: string;
  };
}
```

---

## 8. Protected Routes

Use route guards in React Router. Example with React Router v6+:

```tsx
import { useSession } from "@/lib/auth-client";
import { Navigate, Outlet } from "react-router-dom";

// Requires any authenticated user
function ProtectedRoute() {
  const { data: session, isPending } = useSession();
  if (isPending) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Requires a specific role
function RoleRoute({ role }: { role: "professional" | "patient" }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
```

### Router setup example

```tsx
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignUpPage />} />

  {/* Any authenticated user */}
  <Route element={<ProtectedRoute />}>
    <Route path="/settings" element={<SettingsPage />} />
  </Route>

  {/* Professional only */}
  <Route element={<RoleRoute role="professional" />}>
    <Route path="/dashboard" element={<ProfessionalDashboard />} />
    <Route path="/patients" element={<PatientsPage />} />
    <Route path="/appointments" element={<AppointmentsPage />} />
  </Route>

  {/* Patient only */}
  <Route element={<RoleRoute role="patient" />}>
    <Route path="/my-appointments" element={<PatientAppointments />} />
    <Route path="/my-profile" element={<PatientProfile />} />
  </Route>
</Routes>
```

---

## 9. Making Authenticated API Calls

Because Better Auth uses **cookies** (not Authorization headers), `fetch` calls just need `credentials: "include"`:

```ts
const API_BASE = "http://localhost:3000/api/v1";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // sends the session cookie
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Session expired → redirect to login
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Usage
const patients = await apiFetch<{ data: Patient[] }>("/patients");
const appointment = await apiFetch<Appointment>("/appointments/some-uuid");
```

> **Tip**: If you use a data-fetching library like TanStack Query, wrap `apiFetch` in your query functions — the session cookie is handled transparently.

---

## 10. Profile Creation on Signup

Both roles get their profile created automatically at signup:

- **Professionals** → a `professionals` row is created with the user's name and email. `profileId` is set immediately.
- **Patients** → a `patients` row is created with the user's name and email. `profileId` is set immediately.

This means `session.user.profileId` is always available after signup — there is no linking step required. The patient can immediately browse availability and book appointments (after signing RGPD consent).

If the patient signed up via a professional's invite link (passing a `professionalId`), they are linked to that professional. Otherwise their `professionalId` is null and gets set when they first book with a professional.

---

## 11. Password Reset Flow

### Step 1: Request reset

```tsx
import { authClient } from "@/lib/auth-client";

await authClient.forgetPassword({
  email: "user@example.com",
  redirectTo: "http://localhost:5173/reset-password", // FE page that handles the token
});
```

Better Auth sends an email with a link containing a reset token.

### Step 2: Reset password

On the `/reset-password` page, extract the token from the URL and call:

```tsx
await authClient.resetPassword({
  newPassword: "new-secure-password",
  token: searchParams.get("token")!,
});
```

> **Note**: Email sending must be configured on the backend (e.g., via a Better Auth email plugin or custom hook). Without it, the reset token won't be delivered.

---

## 12. CORS Configuration

The backend is already configured to accept requests from `http://localhost:5173`:

```ts
cors({
  origin: ["http://localhost:5173"],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true, // required for cookies
})
```

Also in Better Auth config:

```ts
trustedOrigins: ["http://localhost:5173"]
```

> Update both of these when deploying to production.

---

## Quick Reference

| Task                    | FE Code                                         |
|-------------------------|--------------------------------------------------|
| Sign up                 | `signUp.email({ name, email, password, role })`  |
| Sign in                 | `signIn.email({ email, password })`               |
| Sign out                | `signOut()`                                        |
| Get session (hook)      | `useSession()` → `{ data, isPending, error }`     |
| Get session (imperative)| `authClient.getSession()`                         |
| API call                | `fetch(url, { credentials: "include" })`          |
| Check role              | `session.user.role`                               |
| Check profile exists    | `session.user.profileId !== null`                  |
| Password reset request  | `authClient.forgetPassword({ email, redirectTo })` |
| Password reset complete | `authClient.resetPassword({ newPassword, token })` |
