Stack & Conventions
Exact versions, preferred libraries, coding style rules, naming conventions.

Global
This is a monorepo, pnpm is the package manager.

Backend

## 1. Backend - Stack Overview

| Layer         | Tool             | Role                                                |
| ------------- | ---------------- | --------------------------------------------------- |
| Runtime       | Node.js (or Bun) | JavaScript runtime                                  |
| Framework     | Hono             | HTTP routing and middleware                         |
| API Contract  | OpenAPI 3.1      | Single source of truth for all endpoints            |
| ORM / Schema  | Drizzle ORM      | DB schema → type safety → OpenAPI types             |
| Documentation | Scalar           | Interactive API docs rendered from the OpenAPI spec |
| Testing       | Vitest           | Type-safe API tests derived from OpenAPI types      |

---

## 2. Frontend - Stack Overview

- **Core**: React 19 + TypeScript 5
- **Build Tool**: Vite
- **Routing**: **TanStack Router** (Full type safety for nested routes and complex search params, critical for calendar navigation)
- **Data Fetching**: TanStack Query (Tight integration with TanStack Router loaders)
- **Styling**: Tailwind CSS + shadcn/ui
- **Table/Grid**: **TanStack Table** (Highly recommended for sorting/filtering patient lists and billing history)
- **Form Management**: TanStack Form (Consistent type safety across the entire stack)
- **Auth**: Better Auth Client SDK
