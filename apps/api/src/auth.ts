import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { db } from "./db/index.ts";
import * as schema from "./db/schema.ts";
import { env } from "./env.ts";
import { getTrustedOrigins } from "./lib/trusted-origins.ts";
import { migrateAnonymousUserData } from "./services/auth/migrate-anonymous-user.ts";

const secret = env.BETTER_AUTH_SECRET;
const baseURL = env.BETTER_AUTH_URL;

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
				type: "string",
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
	plugins: [
		anonymous({
			onLinkAccount: async ({ anonymousUser, newUser }) => {
				await migrateAnonymousUserData({
					fromUserId: anonymousUser.user.id,
					toUserId: newUser.user.id,
				});
			},
		}),
	],
});
