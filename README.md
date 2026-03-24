# atlas

## Local database

Postgres with **pgvector** is defined in [`docker-compose.yml`](docker-compose.yml). New clones: `docker compose up -d` and set `DATABASE_URL` to `…/mastra` (see [`apps/api/.env.example`](apps/api/.env.example)).

If you are moving from the previous plain-Postgres volume, follow **Migrating from the old volume** in [`apps/api/README.md`](apps/api/README.md).
