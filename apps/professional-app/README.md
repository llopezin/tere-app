# Professional App

This is the professional-facing workspace of the Fisio App. It shares its UI library with `@fisio-app/client-app` but uses a distinct blue theme to visually differentiate it from the client-facing application.

## Development

Start the dev server:

```bash
pnpm --filter @fisio-app/professional-app dev
```

## Building

Build the application:

```bash
pnpm --filter @fisio-app/professional-app build
```

## Linting & Formatting

Run linting:

```bash
pnpm --filter @fisio-app/professional-app lint
```

Format code:

```bash
pnpm --filter @fisio-app/professional-app fmt
```

## Architecture

- **Theme**: Uses a blue color scheme (primary: #1d4ed8 / blue-700) for visual distinction from client-app
- **Shared UI**: Consumes `@fisio-app/ui` component library
- **Framework**: Next.js with App Router (`src/app`), runs on port 5174, the origin the backend trusts
- **Data and auth**: fetched in the browser with TanStack Query, Hono RPC and Better Auth
- **Styling**: Tailwind CSS v4
