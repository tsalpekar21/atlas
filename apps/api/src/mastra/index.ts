import { MastraAuthBetterAuth } from "@mastra/auth-better-auth";
import { Mastra } from "@mastra/core/mastra";
import { serve as inngestServe } from "@mastra/inngest";
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
import { inngest } from "../inngest/client.ts";
import { getTrustedOrigins } from "../lib/trusted-origins.ts";
import { healthAssistant } from "./agents/health-assistant/index.ts";
import { researchSynthesizer } from "./agents/research/synthesizer.ts";
import { guidelineResearcher } from "./agents/research/workers/guideline-researcher.ts";
import { literatureResearcher } from "./agents/research/workers/literature-researcher.ts";
import { backgroundResearchWorkflow } from "./workflows/background-research.ts";

const mastraAuth = new MastraAuthBetterAuth({
	// Mastra's `Auth` type predates plugin/additionalField inference; runtime instance is correct.
	auth: auth as unknown as Auth,
});

const trustedOrigins = getTrustedOrigins();

export const mastra = new Mastra({
	agents: {
		healthAssistant,
		researchSynthesizer,
		guidelineResearcher,
		literatureResearcher,
	},
	workflows: {
		backgroundResearch: backgroundResearchWorkflow,
	},
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
		apiRoutes: [
			{
				// `@mastra/inngest`'s `serve()` auto-discovers every Mastra workflow
				// registered above that uses the Inngest execution engine and
				// exposes them as Inngest functions under this endpoint. We don't
				// pass `functions: [...]` — the workflow registration is enough.
				path: "/api/inngest",
				method: "ALL",
				createHandler: async ({ mastra }) =>
					inngestServe({ mastra, inngest }),
			},
		],
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
