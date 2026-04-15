import { initialize } from "@atlas/logger";
import { inject } from "vitest";

/**
 * Runs in each integration test worker BEFORE test files' static imports
 * resolve. Reads values provided by `global-setup.ts` via `inject(...)` and
 * writes them to `process.env` so that `src/env.ts` validates cleanly when
 * modules under test are loaded — critical because `env.ts` evaluates its
 * schema at module import time.
 *
 * After env is populated, the shared logger is initialised the same way
 * `src/bootstrap.ts` does it at app startup. Any module that creates a
 * child logger at import time (notably the Mastra workflows) would
 * otherwise throw `initialize() must be called before getLogger()`.
 *
 * The non-container env vars (BETTER_AUTH_*, FIRECRAWL_*, GOOGLE_*, etc.)
 * are fake but shape-valid. Integration tests that actually exercise those
 * services would overlay MSW handlers or swap these for real values.
 */
const fakeSecret32 = "b".repeat(32);
const fakeSecret48 = "c".repeat(48);

process.env.DATABASE_URL = inject("databaseUrl");
process.env.CLOUD_TASKS_EMULATOR_HOST = inject("cloudTasksEmulatorHost");
process.env.GCLOUD_PROJECT = inject("cloudTasksProject");
process.env.GCLOUD_LOCATION = inject("cloudTasksLocation");
process.env.CLOUD_TASKS_AUTH_SECRET = inject("cloudTasksAuthSecret");

process.env.BETTER_AUTH_SECRET = fakeSecret32;
process.env.BETTER_AUTH_URL = "http://localhost:4111";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
process.env.FIRECRAWL_API_KEY = "test-key";
process.env.FIRECRAWL_WEBHOOK_SECRET = "test-secret";
process.env.MASTRA_API_KEY = fakeSecret48;
process.env.CLOUD_TASKS_TARGET_BASE_URL = "http://host.docker.internal:4111";
process.env.NODE_ENV = "test";

initialize({ applicationEnvironment: "development" });
