# AGENTS.md

This document provides guidance for AI coding agents working in the bot app.

## Project Overview

This is a **TanStack Start** application (React + Nitro server) that serves the frontend UI and proxies AI requests to the standalone Mastra server in `apps/api/`.

Mastra code (agents, tools, workflows) lives in `apps/api/`, not here. This app communicates with the Mastra server via HTTP.

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
| `SERVER_URL` | URL of the API server (default: `http://localhost:4111`) |
| `API_TOKEN` | API token for authenticating with the API server |

## Shared Types

Shared Zod schemas and types (e.g. `TriageMessage`, `PresentQuestionInput`) come from `@atlas/schemas` in `packages/schemas/`.
