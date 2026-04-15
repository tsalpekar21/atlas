/**
 * Unit-test env bootstrap. Runs in each worker BEFORE test files' static
 * imports resolve, so when the first test imports `src/env.ts` (directly or
 * transitively) Zod validation passes.
 *
 * Values here are fake but shape-valid (URLs are valid URLs, secrets are
 * ≥32 chars). Tests that need a specific value should override the variable
 * before importing the module under test.
 *
 * DATABASE_URL points at an unreachable port on purpose — unit tests must
 * not open real DB connections. The postgres client is lazy about connecting,
 * so importing `src/db/index.ts` in a unit test is fine; only a query would
 * fail. Anything that needs to actually hit Postgres belongs in the
 * integration project.
 */
const fakeSecret32 = "x".repeat(32);
const fakeSecret48 = "y".repeat(48);

const defaults: Record<string, string> = {
	DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test",
	BETTER_AUTH_SECRET: fakeSecret32,
	BETTER_AUTH_URL: "http://localhost:4111",
	GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
	FIRECRAWL_API_KEY: "test-key",
	FIRECRAWL_WEBHOOK_SECRET: "test-secret",
	MASTRA_API_KEY: fakeSecret48,
	GCLOUD_PROJECT: "test",
	GCLOUD_LOCATION: "here",
	CLOUD_TASKS_TARGET_BASE_URL: "http://localhost:4111",
	CLOUD_TASKS_AUTH_SECRET: fakeSecret32,
};

for (const [key, value] of Object.entries(defaults)) {
	if (!process.env[key]) {
		process.env[key] = value;
	}
}
