# Atlas API (Mastra + Hono)

## Database migrations (Drizzle)

Doctor enrichment tables live in the same Postgres database as Mastra (`DATABASE_URL`).

```bash
# From repo root
pnpm --filter @atlas/api db:migrate
```

After changing [`src/db/schema.ts`](src/db/schema.ts):

```bash
pnpm --filter @atlas/api db:generate   # create SQL under drizzle/
pnpm --filter @atlas/api db:migrate     # apply
```

Optional: `pnpm --filter @atlas/api db:studio` for Drizzle Studio.

## NPI provider search (proxy)

`GET /npi/providers?...` — proxies to CMS NPPES v2.1. Query params include `providerName`, `npi`, `city`, `state`, **`specialty`** (sent to NPPES as `taxonomy_description`), `limit`, `skip`. At least one search criterion is required. Each result includes full `registry` plus table fields and enrichment. Response includes `hasMore`, `hasPrevious`, not a total count.

## NPI web search & enrichment

- **`POST /npi/web-search`** — JSON `{ "npi": "1234567890", "limit"?: 10 }` (max 20). Fetches NPPES record, builds a Firecrawl web query, returns `{ searchQuery, web: [{ url, title?, description? }] }` (does not persist search).

- **`POST /npi/enrich`** — JSON `{ "npi": "...", "seedUrl": "https://...", "title"?: "...", "description"?: "..." }`. Crawls the chosen URL only (stores a manual search row + crawl).

Requires `Authorization: Bearer <API_TOKEN>` when `API_TOKEN` is set.

Set `FIRECRAWL_API_URL` (default `http://localhost:3002`) and `FIRECRAWL_API_KEY` if your Firecrawl instance requires a key.
