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
		PORT: process.env.PORT,
		NODE_ENV: process.env.NODE_ENV,
	},
	emptyStringAsUndefined: true,
});
