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
		await migrate(drizzle(migrationClient), { migrationsFolder });
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

	return async () => {
		await emulatorContainer?.stop();
		await postgresContainer?.stop();
	};
}
