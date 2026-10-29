# Stack & Repo Organization — Three Proposals

> **Context:** A clinic management app (fisio-app) that must run on **desktop** (web browser) and **mobile** (native iOS/Android). The backend is already defined (Hono + Drizzle + OpenAPI). The frontend uses React + Tailwind + Vitest. The repo is a pnpm monorepo.

---

## Proposal 1 — Expo Unified (React Native + Expo Web)

**Idea:** Use a single Expo (React Native) codebase that compiles to native iOS, native Android, *and* web. All UI components are written once using React Native primitives and rendered natively on mobile and via React Native Web on desktop browsers.

### Repo Structure

```
packages/
  backend/           ← existing (Hono + Drizzle)
  app/               ← Expo app (iOS, Android, Web)
  shared/            ← business logic, types, API client, validation
  ui/                ← shared design-system components (RN primitives)
```

### Key Tech Choices

| Layer | Tool | Why |
|---|---|---|
| Mobile framework | Expo SDK (~52) | Managed workflow, OTA updates, native modules |
| Web rendering | Expo Web (React Native Web) | Same components render to DOM |
| Styling | NativeWind (Tailwind for RN) | Keeps your Tailwind mental model |
| Navigation | Expo Router (file-based) | Works on all three platforms |
| API client | Generated from OpenAPI spec | Shared in `packages/shared` |
| State | TanStack Query + Zustand | Data fetching + minimal global state |

### Pros

- **Maximum code sharing (~90-95%)** — a single `<AppointmentCard />` renders natively on iOS and as a `<div>` on web, no duplication.
- **Truly native mobile** — Expo compiles to native views, not a WebView. Smooth 60fps animations, native gestures, push notifications via Expo Notifications.
- **Single team, single codebase** — one set of tests, one CI pipeline, one deployment flow. Ideal for a small team.
- **Expo ecosystem** — OTA updates (EAS Update) let you push fixes without App Store review. EAS Build handles iOS/Android builds in the cloud.
- **File-based routing** — Expo Router gives Next.js-like file routing that works on all platforms.

### Cons

- **Web fidelity tradeoffs** — React Native Web maps RN primitives to DOM elements, but some CSS features (complex grids, `backdrop-filter`, advanced animations) need workarounds or platform-specific code.
- **Tailwind is indirect** — NativeWind bridges Tailwind → RN styles, but it's not identical to using Tailwind CSS directly. Some utility classes may not be supported.
- **Heavier web bundle** — The web output includes the React Native Web runtime, making the initial bundle larger than a pure Vite+React app.
- **Ecosystem friction** — Some popular React web libraries (e.g., date pickers, rich text editors) don't work in RN, so you may need RN-specific alternatives.
- **Learning curve** — If the team is comfortable with web React but not React Native, there's an onboarding cost (Flexbox-only layout, no CSS cascade, different debugging tools).

### Best For

Teams that want **one codebase to rule all platforms** and are willing to accept some web-side compromises for the convenience of native mobile with minimal duplication.

---

## Proposal 2 — Vite+React Web + Expo Mobile (Shared Logic, Separate UI)

**Idea:** Keep the web/desktop app as a standard Vite + React + Tailwind SPA (fast, familiar, no compromises). Build a separate Expo React Native app for mobile. Share all business logic, types, API client, and validation via internal packages — but let each platform own its UI layer.

### Repo Structure

```
packages/
  backend/           ← existing (Hono + Drizzle)
  web/               ← Vite + React + Tailwind (desktop browser)
  mobile/            ← Expo React Native (iOS + Android)
  shared/            ← types, API client, validation, business logic
  ui-web/            ← web-specific component library (Tailwind)
  ui-mobile/         ← RN-specific component library (NativeWind or StyleSheet)
```

### Key Tech Choices

| Layer | Tool | Why |
|---|---|---|
| Web framework | Vite + React | Fast DX, HMR, optimized builds |
| Web styling | Tailwind CSS 4 | Already chosen, best-in-class for web |
| Mobile framework | Expo SDK | Native rendering, managed workflow |
| Mobile styling | NativeWind or Tamagui | Native styles with design-token parity |
| Navigation (web) | TanStack Router or React Router | Type-safe, web-native routing |
| Navigation (mobile) | Expo Router | File-based, deep linking support |
| Shared API client | Generated from OpenAPI | Lives in `packages/shared`, used by both |
| Shared state logic | TanStack Query + Zustand | Identical hooks in both platforms |
| Shared validation | Zod schemas | Shared in `packages/shared` |

### Pros

- **Best-of-breed per platform** — the web app uses real Tailwind, real CSS, all web APIs. The mobile app is fully native with platform-specific UX patterns (bottom tabs, native gestures, haptics).
- **No web compromises** — unlike Proposal 1, the desktop web app has zero overhead from React Native Web. Lighter bundles, full CSS power, any web library works.
- **High logic sharing (~60-70%)** — all business logic, API calls, validation, types, and state management are shared. Only the "view" layer differs.
- **Independent deployability** — update the web app without touching mobile, and vice versa. Different release cadences if needed.
- **Familiar stack** — web developers stay in their comfort zone (Vite/Tailwind), mobile developers use standard React Native patterns.

### Cons

- **UI duplication** — every screen is implemented twice (once in Tailwind for web, once in RN for mobile). For this app (~10-15 screens), that's a manageable but real cost.
- **Design drift risk** — without discipline, the web and mobile UIs can diverge over time. A shared design-token package and Figma-to-code pipeline help mitigate this.
- **Two CI pipelines** — web deploys to a CDN/hosting, mobile goes through EAS Build + App Store/Play Store. More infra to maintain.
- **Slightly larger codebase** — more packages to maintain, though the monorepo structure keeps things navigable.

### Best For

Teams that **prioritize web performance and native mobile UX** equally, and prefer each platform to feel "natural" rather than forcing one abstraction across both. Good when the professional-facing desktop experience and the patient-facing mobile experience have significantly different UI needs (which this PRD suggests).

---

## Proposal 3 — Expo Mobile + Tauri Desktop (Native Everywhere)

**Idea:** If "desktop" means a **native desktop application** (not just a browser tab), use Tauri to wrap a React + Tailwind frontend into a lightweight native desktop app (macOS/Windows/Linux). Use Expo for native mobile. Share a React component library between both.

### Repo Structure

```
packages/
  backend/           ← existing (Hono + Drizzle)
  desktop/           ← Tauri shell + React frontend (Vite + Tailwind)
  mobile/            ← Expo React Native (iOS + Android)
  shared/            ← types, API client, validation, business logic
  ui/                ← shared design-system tokens + primitives
```

### Key Tech Choices

| Layer | Tool | Why |
|---|---|---|
| Desktop shell | Tauri v2 | Rust-based, tiny binary (~5MB), native OS APIs |
| Desktop frontend | Vite + React + Tailwind | Rendered in a native webview (not Electron) |
| Mobile framework | Expo SDK | Truly native iOS/Android |
| Shared API client | Generated from OpenAPI | In `packages/shared` |
| Desktop distribution | Tauri's built-in updater | Auto-updates, code signing |
| Offline support | SQLite (via Tauri plugin) | Local-first for the desktop app |

### Pros

- **Native everywhere** — the mobile app is fully native (React Native), the desktop app is a real native window (not a browser tab), and it integrates with OS features (menu bar, system tray, file system, notifications).
- **Tiny desktop footprint** — unlike Electron, Tauri uses the OS webview (WebKit on macOS, WebView2 on Windows), resulting in ~5-10MB installers vs Electron's 100MB+.
- **Offline-capable desktop** — the professional could use the app without internet, syncing when connectivity returns. Tauri gives access to local SQLite, filesystem, etc.
- **Web tech for desktop UI** — the desktop frontend is still React + Tailwind, so web developers can work on it without learning new paradigms.
- **Independent deployment** — desktop auto-updates via Tauri updater, mobile via EAS.

### Cons

- **Two UI codebases** — same as Proposal 2, mobile and desktop UIs are separate. Less code sharing on the view layer.
- **Tauri learning curve** — Tauri's Rust backend can be intimidating if the team isn't familiar. However, for most features you don't need to write Rust — plugins handle common needs.
- **More complex distribution** — distributing a desktop app means code-signing certificates, notarization (macOS), installer packaging. More ops overhead than a web URL.
- **Overkill if web is fine** — if the professionals are happy accessing the app via a browser on their desktop, Tauri adds complexity with no user benefit. A native desktop app is only worth it if you need offline mode, system-tray presence, or OS-level integrations.
- **Smaller ecosystem** — Tauri is growing but has fewer plugins and community resources than Electron.

### Best For

Teams that need a **true native desktop experience** (offline mode, OS integration, kiosk/clinic installation) alongside a native mobile app. Not recommended if a browser-based desktop experience is acceptable.

---

## Recommendation Matrix

| Criteria | Proposal 1 (Expo Unified) | Proposal 2 (Vite Web + Expo Mobile) | Proposal 3 (Tauri + Expo) |
|---|---|---|---|
| Code sharing | ⭐⭐⭐⭐⭐ (~95%) | ⭐⭐⭐ (~65%) | ⭐⭐⭐ (~60%) |
| Native mobile quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Web/desktop quality | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Team ramp-up (React web team) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Offline desktop support | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Maintenance burden | ⭐⭐⭐⭐⭐ (1 codebase) | ⭐⭐⭐ (2 UIs) | ⭐⭐ (2 UIs + Tauri ops) |
| Fits this PRD | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

### For This Specific Project

**Proposal 2** is likely the best fit because:
1. The **professional app** (calendar, accounting, patient management) is a complex desktop-first experience where full CSS power and web libraries matter.
2. The **patient app** (booking, data consent, invoices) is mobile-first and benefits from a truly native feel.
3. The two user roles have **different UI needs** — professionals need dense data views (tables, calendars), patients need simple flows (book → sign → done). Forcing both through one UI abstraction adds friction.
4. The backend already exposes OpenAPI, so generating a shared typed API client is trivial — the main cost of Proposal 2 (UI duplication) is offset by heavy logic sharing.

However, if the team is small (1-2 developers) and speed is the priority, **Proposal 1** saves significant time by eliminating UI duplication entirely.
