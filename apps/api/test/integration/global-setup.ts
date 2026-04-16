import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
	GenericContainer,
	type StartedTestContainer,
	Wait,
} from "testcontainers";
import { sql } from "drizzle-orm";
import type { TestProject } from "vitest/node";

/**
 * Vitest global setup for the integration project. Runs once per test run
 * in the main process, before any worker spawns. Starts two containers:
 *
 *   1. Postgres (pgvector/pgvector:pg17 — same image as the dev compose
 *      stack, required because the schema uses the `vector` extension).
 *   2. aertje/cloud-tasks-emulator — a gRPC-compatible stand-in for the
 *      real Cloud Tasks service. `src/tasks/client.ts` already routes to
 *      it when `CLOUD_TASKS_EMULATOR_HOST` is set.
 *
 * After the containers are up, Drizzle migrations are applied against the
 * test Postgres so the schema matches what the app expects. The `here`
 * location and `test` project values are arbitrary placeholders — the
 * emulator accepts any non-empty string.
 *
 * Values are shared with workers via `project.provide(...)`. A
 * matching setupFile (`worker-env.ts`) reads them with `inject(...)` and
 * writes them to `process.env` so `src/env.ts` validates cleanly when
 * modules under test are loaded.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../src/db/drizzle");

let postgresContainer: StartedPostgreSqlContainer | undefined;
let emulatorContainer: StartedTestContainer | undefined;

declare module "vitest" {
	export interface ProvidedContext {
		databaseUrl: string;
		cloudTasksEmulatorHost: string;
		cloudTasksProject: string;
		cloudTasksLocation: string;
		cloudTasksAuthSecret: string;
	}
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
	postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg17")
		.withDatabase("atlas_test")
		.withUsername("test")
		.withPassword("test")
		.start();

	const databaseUrl = postgresContainer.getConnectionUri();

	const migrationClient = postgres(databaseUrl, { max: 1 });
	try {
		const migrationDb = drizzle(migrationClient);
		// Mastra's PostgresStore (configured in src/mastra/index.ts with
		// `schemaName: "mastra"`) tries to `CREATE SCHEMA IF NOT EXISTS
		// mastra` on init. In the prod docker compose, that schema lives in
		// a dedicated `mastra` database; here we pre-create it inside the
		// single test DB so the init is a no-op. Mastra's table init also
		// races on `pg_type_typname_nsp_index` when fired concurrently from
		// multiple test files' transitive imports, so we eagerly create the
		// tables here too (see below).
		await migrationDb.execute(sql`CREATE SCHEMA IF NOT EXISTS mastra`);
		await migrate(migrationDb, { migrationsFolder });
	} finally {
		await migrationClient.end();
	}

	emulatorContainer = await new GenericContainer(
		"ghcr.io/aertje/cloud-tasks-emulator:latest",
	)
		.withCommand(["-host=0.0.0.0", "-port=8123"])
		.withExposedPorts(8123)
		.withWaitStrategy(Wait.forListeningPorts())
		.start();

	const cloudTasksEmulatorHost = `${emulatorContainer.getHost()}:${emulatorContainer.getMappedPort(8123)}`;
	const cloudTasksProject = "test";
	const cloudTasksLocation = "here";
	const cloudTasksAuthSecret = "a".repeat(32);

	project.provide("databaseUrl", databaseUrl);
	project.provide("cloudTasksEmulatorHost", cloudTasksEmulatorHost);
	project.provide("cloudTasksProject", cloudTasksProject);
	project.provide("cloudTasksLocation", cloudTasksLocation);
	project.provide("cloudTasksAuthSecret", cloudTasksAuthSecret);

	// Eagerly initialise Mastra's Postgres tables + the `page_chunks`
	// PgVector index in this main process before any worker spawns. Without
	// this, tests that transitively import `src/mastra/index.ts` (e.g. via
	// `src/tasks/registry.ts` → `src/services/research.ts`) fire
	// `PostgresStore.init` concurrently with other tests' PgVector calls
	// against the same DB — Mastra's parallel `CREATE TABLE IF NOT EXISTS`
	// sub-init methods race on `pg_type_typname_nsp_index` and surface as
	// unhandled rejections. Pre-creating the tables here makes those later
	// CREATE TABLE IF NOT EXISTS calls true no-ops at the Postgres level.
	//
	// Env vars must be set before `src/env.ts` is imported (it validates at
	// module load time), so we populate them here for the duration of this
	// main-process setup.
	process.env.DATABASE_URL = databaseUrl;
	process.env.CLOUD_TASKS_EMULATOR_HOST = cloudTasksEmulatorHost;
	process.env.GCLOUD_PROJECT = cloudTasksProject;
	process.env.GCLOUD_LOCATION = cloudTasksLocation;
	process.env.CLOUD_TASKS_AUTH_SECRET = cloudTasksAuthSecret;
	process.env.BETTER_AUTH_SECRET = "b".repeat(32);
	process.env.BETTER_AUTH_URL = "http://localhost:4111";
	process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
	process.env.FIRECRAWL_API_KEY = "test-key";
	process.env.FIRECRAWL_WEBHOOK_SECRET = "test-secret";
	process.env.MASTRA_API_KEY = "c".repeat(48);
	process.env.CLOUD_TASKS_TARGET_BASE_URL = "http://host.docker.internal:4111";
	process.env.NODE_ENV ??= "test";

	const { initialize } = await import("@atlas/logger");
	initialize({ applicationEnvironment: "development" });
	const { mastra } = await import("../../src/mastra/index.ts");
	const {
		CHUNKS_DIMENSION,
		CHUNKS_INDEX_NAME,
		CHUNKS_VECTOR_TYPE,
		pgVectorChunks,
	} = await import("../../src/mastra/rag/page-chunks-store.ts");

	const mastraStorage = await mastra.getStorage();
	if (mastraStorage) {
		await mastraStorage.init();
	}
	await pgVectorChunks.createIndex({
		indexName: CHUNKS_INDEX_NAME,
		dimension: CHUNKS_DIMENSION,
		vectorType: CHUNKS_VECTOR_TYPE,
	});

	return async () => {
		// Close the pools opened in this process before stopping the
		// container, otherwise node emits an unhandled `terminating
		// connection due to administrator command` as Postgres tears down
		// in-flight connections.
		try {
			await pgVectorChunks.disconnect();
		} catch {
			// best-effort — we're tearing down anyway
		}
		try {
			const store = mastraStorage as { close?: () => Promise<void> } | null;
			if (store?.close) await store.close();
		} catch {
			// best-effort
		}
		await emulatorContainer?.stop();
		await postgresContainer?.stop();
	};
}
