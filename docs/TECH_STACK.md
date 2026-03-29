Stack & Conventions
Exact versions, preferred libraries, coding style rules, naming conventions.

Global
This is a monorepo, pnpm is the package manager. 

Backend

## 1. Backend - Stack Overview
 
| Layer | Tool | Role |
|---|---|---|
| Runtime | Node.js (or Bun) | JavaScript runtime |
| Framework | Hono | HTTP routing and middleware |
| API Contract | OpenAPI 3.1 | Single source of truth for all endpoints |
| ORM / Schema | Drizzle ORM | DB schema → type safety → OpenAPI types |
| Documentation | Scalar | Interactive API docs rendered from the OpenAPI spec |
| Testing | Vitest | Type-safe API tests derived from OpenAPI types |
 
---


## 2. Frontend - Stack Overview
Testing - vitest
Vite + react
Tailwind
