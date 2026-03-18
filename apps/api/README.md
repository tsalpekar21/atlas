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

## Doctor enrichment

`POST /doctor-enrichment` with JSON `{ "npis": ["1234567890"] }` (max 50 per request).

Requires `Authorization: Bearer <API_TOKEN>` when `API_TOKEN` is set.

Set `FIRECRAWL_API_URL` (default `http://localhost:3002`) and `FIRECRAWL_API_KEY` if your Firecrawl instance requires a key.
