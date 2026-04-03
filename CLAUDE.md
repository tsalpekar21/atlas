# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas is a full-stack monorepo using **TanStack Start** (React + Nitro server) with a shared **Subframe** UI component library.

## Monorepo Structure

- `apps/web` — Main TanStack Start application (Vite, React 19, Nitro)
- `packages/subframe` — Shared UI component library synced from Subframe design tool

Package manager: **pnpm** (v10+) with workspaces. Task orchestration via **Turbo**.

## Commands

All app commands run from `apps/web/`:

```bash
pnpm dev              # Dev server on port 3000
pnpm build            # Production build
pnpm test             # Run tests (Vitest)
pnpm lint             # Lint with Biome
pnpm format           # Format with Biome
pnpm check            # Full Biome check (lint + format)
```

From the root, use filters:
```bash
pnpm --filter web dev
pnpm --filter web build
```

## Architecture

### Routing
File-based routing via TanStack Router. Routes live in `apps/web/src/routes/`. The route tree is auto-generated in `routeTree.gen.ts` — do not edit manually.

The root route (`__root.tsx`) wraps all pages with React Query provider, Header, and devtools.

### Data Layer
- **TanStack React Query** for server state. Provider setup in `apps/web/src/integrations/tanstack-query/`. The web app calls the API (`apps/api`) using `VITE_API_URL` with **Better Auth** session cookies (`credentials: "include"`); the API uses Postgres via `DATABASE_URL`.
- Server functions handled via Nitro (configured in `vite.config.ts`).

### UI Components
The `@atlas/subframe` workspace package provides 46+ components and 4 layouts, synced from the Subframe design tool (project ID: `1a56b7bac267`).

Import paths:
```tsx
import { Button } from "@atlas/subframe/components/Button";
import { DefaultPageLayout } from "@atlas/subframe/layouts/DefaultPageLayout";
```

Icons come from `@subframe/core` (Feather icons) and `lucide-react`.

**Never modify synced component files** in `packages/subframe/ui/` — they get overwritten on sync. Create wrapper components if custom logic is needed, or add `// @subframe/sync-disable` to the top of the file to prevent future overwrites.

### Styling
Tailwind CSS v4 with Subframe theme tokens. Global styles in `apps/web/src/styles.css` which imports the Subframe theme from `packages/subframe/ui/theme.css`. The theme defines color scales (brand, neutral, error, success, warning) and typography tokens.

## Key Configuration

- **TypeScript**: Strict mode, target ES2022, path alias `@/*` → `./src/*` (web app), `#/*` → `./src/*` (package imports)
- **Vite**: React plugin with React Compiler (Babel), Tailwind plugin, tsconfig-paths, TanStack Start + Nitro
- **Biome**: Linter + formatter (replaces ESLint + Prettier)
- **Env**: See `apps/web` for `VITE_API_URL` (API base URL) and `apps/api/.env.example` for `BETTER_AUTH_*`, `DATABASE_URL`, and `TRUSTED_ORIGINS`.
