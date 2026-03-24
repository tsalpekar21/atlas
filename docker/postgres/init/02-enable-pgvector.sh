#!/usr/bin/env bash
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "mastra" <<-EOSQL
	CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
