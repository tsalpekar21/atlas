import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { db } from "./db/index.ts";
import * as schema from "./db/schema.ts";
import { getTrustedOrigins } from "./lib/trusted-origins.ts";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4111";

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET is required and must be at least 32 characters");
}

const trustedOrigins = getTrustedOrigins();

export const auth = betterAuth({
  secret,
  baseURL,
  basePath: "/api/auth",
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      birthdate: {
        type: "date",
        required: false,
        input: true,
      },
      phoneNumber: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
      httpOnly: true,
    },
  },
  plugins: [anonymous()],
});
