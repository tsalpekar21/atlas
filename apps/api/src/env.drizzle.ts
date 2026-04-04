import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

/**
 * Minimal env for Drizzle CLI (`db:migrate`, `db:generate`, etc.).
 * Import only from `drizzle.config.ts` — avoids loading full API secrets.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  runtimeEnvStrict: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  emptyStringAsUndefined: true,
});
