import { defineConfig } from "vitest/config";

/**
 * Integration test config. Boots real containerised Postgres + Cloud Tasks
 * emulator via Testcontainers in `globalSetup`, runs Drizzle migrations
 * against the test DB, and exposes connection details to workers via
 * `provide()` / `inject()`.
 *
 * Uses the `forks` pool with `singleFork` so all integration tests share
 * one worker process, which means they also share one set of containers.
 * Boot cost (~15s for Postgres image + migrations) is paid once per run.
 *
 * Tests talking to `src/env.ts` need env vars set BEFORE the test file's
 * static imports resolve. `setupFiles` runs in the worker before test
 * files load, so it uses `inject()` to read values provided by global
 * setup and writes them to `process.env` before `env.ts` is touched.
 */
export default defineConfig({
	test: {
		name: "integration",
		include: ["test/integration/**/*.test.ts"],
		globalSetup: ["./test/integration/global-setup.ts"],
		setupFiles: ["./test/integration/worker-env.ts"],
		testTimeout: 120_000,
		hookTimeout: 180_000,
		pool: "forks",
		forks: { singleFork: true },
		environment: "node",
	},
});
