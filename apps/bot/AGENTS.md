# AGENTS.md

This document provides guidance for AI coding agents working in the bot app.

## Project Overview

This is a **TanStack Start** application (React + Nitro server) that serves the frontend UI and proxies AI requests to the standalone Mastra server in `apps/ai/`.

Mastra code (agents, tools, workflows) lives in `apps/ai/`, not here. This app communicates with the Mastra server via HTTP.

## Commands

```bash
pnpm dev          # Dev server on port 3000
pnpm build        # Production build (Vite)
pnpm test         # Run tests (Vitest)
pnpm lint         # Lint with Biome
pnpm check        # Full Biome check (lint + format)
```

## Key Files

| Path | Description |
|------|-------------|
| `src/routes/api/chat.ts` | Stream-proxy to the Mastra server `/chat` endpoint |
| `src/server/thread-functions.ts` | Server functions that call the Mastra server for thread/message management |
| `src/routes/patient-triage-demo.tsx` | Main triage demo page using `useChat` |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MASTRA_SERVER_URL` | URL of the Mastra AI server (default: `http://localhost:4111`) |
| `MASTRA_API_TOKEN` | API token for authenticating with the Mastra server |
| `DATABASE_URL` | PostgreSQL connection string for the app database |

## Shared Types

Shared Zod schemas and types (e.g. `TriageMessage`, `PresentQuestionInput`) come from `@atlas/schemas` in `packages/schemas/`.
