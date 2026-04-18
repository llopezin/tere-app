# Professional App

This is the professional-facing workspace of the Fisio App. It mirrors the structure and setup of `@fisio-app/client-app` but uses a distinct blue theme to visually differentiate it from the client-facing application.

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
- **Routing**: TanStack Router with file-based route generation
- **Build**: Vite with React plugin and Tailwind CSS v4
