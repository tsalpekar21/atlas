# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas is a full-stack monorepo for a health platform. The frontend is a **TanStack Start** app (React 19 + Nitro SSR), the backend is a **Hono** API server with **Mastra** AI agents, and shared packages provide UI components, schemas, and logging.

## Monorepo Structure

- `apps/web` — TanStack Start frontend (Vite, React 19, Nitro)
- `apps/api` — Hono API server with Mastra AI agents, Better Auth, Drizzle ORM + Postgres
- `packages/subframe` — Shared UI component library synced from Subframe design tool
- `packages/schemas` — Shared Zod schemas (exported as `@atlas/schemas`, `@atlas/schemas/api`)
- `packages/logger` — Shared Pino logger (`@atlas/logger`)

Package manager: **pnpm** (v10+) with workspaces. Task orchestration via **Turbo**.

## Commands

### Web app (`apps/web`)

```bash
pnpm dev              # Dev server on port 3000
pnpm build            # Production build
pnpm lint             # Lint with Biome
pnpm format           # Format with Biome
pnpm check            # Full Biome check (lint + format + organize imports)
pnpm typecheck        # TypeScript type checking
```

### API (`apps/api`)

```bash
pnpm dev              # Dev server (tsx watch)
pnpm build            # TypeScript compile
pnpm studio           # Mastra studio on port 3001
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run Drizzle migrations
pnpm db:studio        # Drizzle Studio (DB browser)
```

### From root (via Turbo)

```bash
pnpm dev              # Run all dev servers
pnpm build            # Build all packages/apps
pnpm --filter web dev # Run specific workspace
pnpm --filter api dev
```

## Architecture

### API Server (`apps/api`)
Hono HTTP server with:
- **Routes** in `src/routes/` — Hono route modules mounted on the main app
- **Services** in `src/services/` — Business logic layer called by routes
- **Mastra** in `src/mastra/` — AI agent framework with agents (`agents/`), tools (`tools/`), and Postgres-backed storage
- **Auth** via Better Auth (`src/auth.ts`) with Drizzle adapter, handles `/api/auth/*`
- **Database** via Drizzle ORM (`src/db/`) with Postgres; schema in `src/db/schema.ts`, migrations in `src/db/drizzle/`
- **Middleware** in `src/middleware/` (e.g., session requirement)
- The app type is exported (`AppType`) for end-to-end type safety with the frontend

### Web Frontend (`apps/web`)
- **Routing**: File-based via TanStack Router. Routes in `src/routes/`. The route tree is auto-generated in `routeTree.gen.ts` — do not edit manually.
- **Root route** (`__root.tsx`) wraps all pages with React Query provider and TanStack DevTools.
- **Data fetching**: TanStack React Query. The web app calls `apps/api` via `VITE_API_URL` with Better Auth session cookies (`credentials: "include"`).
- **AI chat**: Uses `@ai-sdk/react` for streaming AI interactions.

### UI Components (`packages/subframe`)
The `@atlas/subframe` workspace provides 46+ components and 4 layouts synced from Subframe (project ID: `1a56b7bac267`).

```tsx
import { Button } from "@atlas/subframe/components/Button";
import { DefaultPageLayout } from "@atlas/subframe/layouts/DefaultPageLayout";
```

Icons: `@subframe/core` (Feather icons), `lucide-react`, `@hugeicons/react`.

**Never modify synced component files** in `packages/subframe/ui/` — they get overwritten on sync. Create wrapper components if custom logic is needed, or add `// @subframe/sync-disable` to the top of the file to prevent future overwrites.

### Styling
Tailwind CSS v4 with Subframe theme tokens. Global styles in `apps/web/src/styles.css` importing theme from `packages/subframe/ui/theme.css`. Theme defines color scales (brand, neutral, error, success, warning) and typography tokens.

### Shared Packages
- `@atlas/schemas` — Zod v4 schemas shared between API and web (API types, triage types). Must be built before consumers.
- `@atlas/logger` — Pino-based logger with `initialize()` for env setup and structured logging.

## Key Configuration

- **TypeScript**: Strict mode, ES2022. Path alias `@/*` → `./src/*` (web), `#/*` → `./src/*` (packages)
- **Vite**: React plugin with React Compiler (Babel), Tailwind plugin, TanStack Start + Nitro
- **Env validation**: `@t3-oss/env-core` in both apps. Web uses `VITE_API_URL`, `VITE_FRONTEND_URL`. API uses `DATABASE_URL`, `BETTER_AUTH_*`, `TRUSTED_ORIGINS`. See `apps/api/.env.example`.
- **Turbo**: `build` tasks depend on `^build` (packages build first). Build outputs: `.output/`, `.mastra/`, `dist/`.
