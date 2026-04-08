import { MastraAuthBetterAuth } from "@mastra/auth-better-auth";
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import {
	CloudExporter,
	DefaultExporter,
	Observability,
	SensitiveDataFilter,
} from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import type { Auth } from "better-auth";
import { auth } from "../auth.ts";
import { env } from "../env.ts";
import { getTrustedOrigins } from "../lib/trusted-origins.ts";
import { triageAgent } from "./agents/triage/index.ts";

const mastraAuth = new MastraAuthBetterAuth({
	// Mastra's `Auth` type predates plugin/additionalField inference; runtime instance is correct.
	auth: auth as unknown as Auth,
});

const trustedOrigins = getTrustedOrigins();

export const mastra = new Mastra({
	agents: { triageAgent },
	storage: new PostgresStore({
		id: "mastra-storage",
		connectionString: env.DATABASE_URL,
		schemaName: "mastra",
	}),
	server: {
		auth: env.NODE_ENV === "production" ? mastraAuth : undefined,
		cors: {
			origin: (origin) => {
				if (!origin) {
					return trustedOrigins[0];
				}
				return trustedOrigins.includes(origin) ? origin : undefined;
			},
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization", "Cookie"],
			exposeHeaders: ["Content-Length", "Set-Cookie"],
			credentials: true,
			maxAge: 600,
		},
	},
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	observability: new Observability({
		configs: {
			default: {
				serviceName: "mastra",
				exporters: [new DefaultExporter(), new CloudExporter()],
				spanOutputProcessors: [new SensitiveDataFilter()],
			},
		},
	}),
});
