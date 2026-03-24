#!/usr/bin/env bash
# Copy the default `postgres` database from legacy -> pgvector (full logical dump).
# The `mastra` database is not migrated; on the new volume it stays as created by docker init (empty Mastra storage).
#
# Prerequisites:
#   1. docker compose --profile legacy up -d postgres_legacy
#   2. docker compose up -d postgres
#
# After a successful run:
#   docker compose --profile legacy stop postgres_legacy

set -euo pipefail

LEGACY_CONTAINER="${LEGACY_CONTAINER:-atlas-postgres-legacy}"
TARGET_CONTAINER="${TARGET_CONTAINER:-atlas-postgres}"
DB_NAME="${DB_NAME:-postgres}"

if ! docker inspect "$LEGACY_CONTAINER" >/dev/null 2>&1; then
	echo "error: container '$LEGACY_CONTAINER' not found. Start it with: docker compose --profile legacy up -d postgres_legacy" >&2
	exit 1
fi

if ! docker inspect "$TARGET_CONTAINER" >/dev/null 2>&1; then
	echo "error: container '$TARGET_CONTAINER' not found. Start it with: docker compose up -d postgres" >&2
	exit 1
fi

echo "Migrating database '$DB_NAME' from $LEGACY_CONTAINER -> $TARGET_CONTAINER..."
# Omit the archive path so pg_restore reads from stdin (a trailing "-" is treated as a real path in some builds).
docker exec "$LEGACY_CONTAINER" pg_dump -U postgres -Fc -d "$DB_NAME" |
	docker exec -i "$TARGET_CONTAINER" pg_restore -U postgres -d "$DB_NAME" --clean --if-exists --no-owner

echo "Ensuring pgvector extension exists on $DB_NAME..."
docker exec "$TARGET_CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Done. Database '$DB_NAME' restored. The mastra database was not copied (fresh init only)."
echo "Verify: docker exec -it $TARGET_CONTAINER psql -U postgres -d $DB_NAME -c '\\dt'"
