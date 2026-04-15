import { defineConfig } from "vitest/config";

/**
 * Unit test config. Fast, no containers, no network.
 *
 * Unit tests live next to the code they cover as `*.test.ts` under `src/`.
 * Anything that needs a real Postgres, the Cloud Tasks emulator, or outbound
 * HTTP belongs in `test/integration/` and runs under `vitest.integration.config.ts`.
 *
 * The setup file populates `process.env` with fake-but-valid values so that
 * `src/env.ts` (loaded transitively by many modules) passes its Zod validation
 * at module load time. Tests that need different values can override
 * `process.env.*` before importing the module under test.
 */
export default defineConfig({
	test: {
		name: "unit",
		include: ["src/**/*.test.ts"],
		setupFiles: ["./test/setup/unit-env.ts"],
		environment: "node",
	},
});
