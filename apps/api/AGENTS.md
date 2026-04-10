# AGENTS.md

This document provides guidance for AI coding agents working in this repository.

## CRITICAL: Mastra Skill Required

**BEFORE doing ANYTHING with Mastra code or answering Mastra questions, load the Mastra skill FIRST.**

See [Mastra Skills section](#mastra-skills) for loading instructions.

## Project Overview

This is a **Mastra** project written in TypeScript. Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack.

## Commands

Use these commands to interact with the project.

### Installation

```bash
pnpm install
```

### Development

Start the Hono dev server at localhost:4111:

```bash
pnpm dev
```

### Build

Build a production-ready server (outputs to `dist/`):

```bash
pnpm build
```

## Project Structure

Folders organize your agent's resources, like agents, tools, and workflows.

| Folder                 | Description                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/mastra`           | Entry point for all Mastra-related code and configuration.                                                                               |
| `src/mastra/agents`    | Define and configure your agents - their behavior, goals, and tools.                                                                     |
| `src/mastra/workflows` | Define multi-step workflows that orchestrate agents and tools together.                                                                  |
| `src/mastra/tools`     | Create reusable tools that your agents can call                                                                                          |
| `src/mastra/mcp`       | (Optional) Implement custom MCP servers to share your tools with external agents                                                         |
| `src/mastra/scorers`   | (Optional) Define scorers for evaluating agent performance over time                                                                     |
| `src/mastra/public`    | (Optional) Contents are copied into the `.build/output` directory during the build process, making them available for serving at runtime |

### Top-level files

Top-level files define how your Mastra project is configured, built, and connected to its environment.

| File                  | Description                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/mastra/index.ts` | Central entry point where you configure and initialize Mastra.                                                    |
| `.env.example`        | Template for environment variables - copy and rename to `.env` to add your secret [model provider](/models) keys. |
| `package.json`        | Defines project metadata, dependencies, and available npm scripts.                                                |
| `tsconfig.json`       | Configures TypeScript options such as path aliases, compiler settings, and build output.                          |

## API Client Convention — Always Use Hono RPC

When calling API endpoints from the web app (`apps/web`), **always use the typed
Hono RPC client** created by `createTriageApiClient()` in
`apps/web/src/lib/triage-api-client.ts`. Do **not** assemble base URLs and call
`fetch()` directly.

The RPC client gives you end-to-end type safety: request params, query strings,
and JSON bodies are validated at compile time against the `zValidator` schemas
defined on the API routes.

### Exceptions (do NOT convert these)

| Call site | Why it cannot use RPC |
|---|---|
| `apps/web/src/hooks/use-research-status.ts` | Uses `EventSource` for SSE — a fundamentally different transport that Hono RPC does not support. |
| `apps/web/src/lib/auth-client.ts` | Uses `better-auth/react` `createAuthClient`, a library-managed HTTP client. |

### Adding new API routes

When you add a **JSON** endpoint, include it in the `AppType` chain in
`apps/api/src/app.ts` so the RPC client can see it. If the endpoint uses
`streamSSE` or returns a bare `Response`, keep it out of `AppType` (mount it
separately like `researchRoutes`) — otherwise it will collapse the RPC type
to `unknown`.

## Mastra Skills

Skills are modular capabilities that extend agent functionalities. They provide pre-built tools, integrations, and workflows that agents can leverage to accomplish tasks more effectively.

This project has skills installed for the following agents:

- Claude Code
- Cursor

### Loading Skills

1. **Load the Mastra skill FIRST** - Use `/mastra` command or Skill tool
2. **Never rely on cached knowledge** - Mastra APIs change frequently between versions
3. **Always verify against current docs** - The skill provides up-to-date documentation

**Why this matters:** Your training data about Mastra is likely outdated. Constructor signatures, APIs, and patterns change rapidly. Loading the skill ensures you use current, correct APIs.

Skills are automatically available to agents in your project once installed. Agents can access and use these skills without additional configuration.

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Mastra .well-known skills discovery](https://mastra.ai/.well-known/skills/index.json)
