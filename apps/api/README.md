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

## Local Postgres (Docker + pgvector)

From the repo root, `docker compose up -d` starts **`postgres`** on port **5432** using [`pgvector/pgvector:pg17`](https://github.com/pgvector/pgvector) and volume **`postgres_pgvector_data`**. Init scripts under [`docker/postgres/init/`](../../docker/postgres/init/) create the **`mastra`** database and run `CREATE EXTENSION vector` on it.

`DATABASE_URL` should point at that database, e.g. `postgresql://postgres:postgres@localhost:5432/mastra` (see [`.env.example`](./.env.example)).

### Migrating from the old volume (`postgres_data`)

If you already had data in the previous compose setup (plain `postgres:latest`, volume `postgres_data`):

1. **Start both containers** (legacy on **5433**, new pgvector on **5432**):

   ```bash
   docker compose --profile legacy up -d postgres_legacy
   docker compose up -d postgres
   ```

2. **Copy the default `postgres` database** only (streams through Docker; no local `pg_dump`). The **`mastra` database is not migrated** — on the new volume it remains whatever init scripts created (typically an empty DB for Mastra).

   ```bash
   ./scripts/migrate-postgres-to-pgvector.sh
   ```

   Point `DATABASE_URL` at the database where your app tables actually live (often `…/postgres` if that’s where you stored them). If you use the `mastra` DB for Drizzle on a fresh cluster, run `pnpm --filter @atlas/api db:migrate` there.

3. **Stop legacy** when you are satisfied:

   ```bash
   docker compose --profile legacy stop postgres_legacy
   ```

4. Optionally remove the old volume after a backup: `docker volume ls` then `docker volume rm <name>`.

If `pg_restore` fails with a version-related error, your legacy server may be newer than PG 17; switch the main service image in [`docker-compose.yml`](../../docker-compose.yml) to a matching `pgvector/pgvector:pg*` tag (e.g. `pg18`) and recreate the **new** volume before restoring again.

## NPI provider search (proxy)

`GET /npi/providers?...` — proxies to CMS NPPES v2.1. Query params include `providerName`, `npi`, `city`, `state`, **`specialty`** (sent to NPPES as `taxonomy_description`), `limit`, `skip`. At least one search criterion is required. Each result includes full `registry` plus table fields and enrichment. Response includes `hasMore`, `hasPrevious`, not a total count.

## NPI web search & enrichment

- **`POST /npi/web-search`** — JSON `{ "npi": "1234567890", "limit"?: 10 }` (max 20). Fetches NPPES record, builds a Firecrawl web query, returns `{ searchQuery, web: [{ url, title?, description? }] }` (does not persist search).

- **`POST /npi/enrich`** — JSON `{ "npi": "...", "seedUrl": "https://...", "title"?: "...", "description"?: "..." }`. Crawls the chosen URL only (stores a manual search row + crawl).

- **`POST /npi/crawls/:crawlId/chunk`** — Re-chunks stored crawl markdown ([Mastra `MDocument`](https://mastra.ai/docs/rag/chunking-and-embedding)), embeds with Google `gemini-embedding-001`, and upserts into [Mastra `PgVector`](https://mastra.ai/docs/rag/overview) index `doctor_site_crawl_rag` (same DB as `DATABASE_URL`, `public` schema). Also runs automatically after a successful crawl save (failures are logged only).

- **`POST /npi/rag/query`** — JSON `{ "query": string, "topK"?: 1–50, "crawlId"?: uuid, "npi"?: string }`. Embeds the query with `RETRIEVAL_QUERY`, runs similarity search on `doctor_site_crawl_rag`, returns `{ query, tookMs, hits: [{ id, score, text, sourceUrl, crawlId, npi, pageIndex?, chunkIndex? }] }`.

Requires `Authorization: Bearer <API_TOKEN>` when `API_TOKEN` is set.

Set `FIRECRAWL_API_URL` (default `http://localhost:3002`) and `FIRECRAWL_API_KEY` if your Firecrawl instance requires a key.
