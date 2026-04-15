import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const portSchema = z.preprocess((val) => {
	if (val === undefined || val === "" || val === null) {
		return 4111;
	}
	const n = typeof val === "string" ? Number.parseInt(val, 10) : Number(val);
	return Number.isFinite(n) && n > 0 ? n : 4111;
}, z.number().int().positive());

/**
 * Full API server environment. Import this from app code only — not from Drizzle CLI.
 * For migrations, use [`env.drizzle.ts`](./env.drizzle.ts) instead.
 */
export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url().default("http://localhost:4111"),
		TRUSTED_ORIGINS: z.string().optional(),
		CORS_ORIGIN: z.string().optional(),
		GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
		/**
		 * Optional NCBI E-utilities API key for the PubMed search tool. When
		 * set, PubMed rate limits bump from 3 req/s to 10 req/s — important
		 * because research rounds fire parallel workers that both hit PubMed.
		 */
		NCBI_API_KEY: z.string().optional(),
		FIRECRAWL_API_KEY: z.string().min(1),
		FIRECRAWL_WEBHOOK_SECRET: z.string().min(1),
		/**
		 * Bearer token required by Mastra's SimpleAuth for `/api/*` Mastra
		 * routes (used by Mastra Studio and any direct API consumers). Must be
		 * a long, high-entropy random string.
		 */
		MASTRA_API_KEY: z.string().min(32),
		/**
		 * Google Cloud project the Cloud Tasks client targets. Set to `dev`
		 * when running against the emulator; set to the real GCP project id
		 * in production. The emulator doesn't validate project names but the
		 * client library requires one to form queue/task resource paths.
		 */
		GCLOUD_PROJECT: z.string().min(1),
		/**
		 * Cloud Tasks location (region). Use `here` for the emulator (its
		 * default), e.g. `us-central1` in production.
		 */
		GCLOUD_LOCATION: z.string().min(1).default("us-central1"),
		/**
		 * When set, the Cloud Tasks client connects to the local emulator
		 * instead of Google's API. Format: `host:port` (e.g. `localhost:8123`).
		 * Leave unset in production so the client uses Application Default
		 * Credentials to reach the real service.
		 */
		CLOUD_TASKS_EMULATOR_HOST: z.string().optional(),
		/**
		 * Base URL Cloud Tasks will POST to when dispatching a task. In local
		 * dev the emulator runs in Docker and hits the API on the host via
		 * `http://host.docker.internal:4111`; in production this is the
		 * public API URL reachable from Google Cloud Tasks.
		 */
		CLOUD_TASKS_TARGET_BASE_URL: z.string().url(),
		/**
		 * Shared secret used to HMAC-sign the body of every Cloud Tasks
		 * request so task routes can verify the caller. Must be identical on
		 * enqueue and handler sides. Min 32 chars.
		 */
		CLOUD_TASKS_AUTH_SECRET: z.string().min(32),
		PORT: portSchema,
		NODE_ENV: z.string().optional(),
	},
	runtimeEnvStrict: {
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
		CORS_ORIGIN: process.env.CORS_ORIGIN,
		GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		NCBI_API_KEY: process.env.NCBI_API_KEY,
		FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
		FIRECRAWL_WEBHOOK_SECRET: process.env.FIRECRAWL_WEBHOOK_SECRET,
		MASTRA_API_KEY: process.env.MASTRA_API_KEY,
		GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
		GCLOUD_LOCATION: process.env.GCLOUD_LOCATION,
		CLOUD_TASKS_EMULATOR_HOST: process.env.CLOUD_TASKS_EMULATOR_HOST,
		CLOUD_TASKS_TARGET_BASE_URL: process.env.CLOUD_TASKS_TARGET_BASE_URL,
		CLOUD_TASKS_AUTH_SECRET: process.env.CLOUD_TASKS_AUTH_SECRET,
		PORT: process.env.PORT,
		NODE_ENV: process.env.NODE_ENV,
	},
	emptyStringAsUndefined: true,
});
