import { logger } from "@atlas/logger";
import {
	type HonoBindings,
	type HonoVariables,
	MastraServer,
} from "@mastra/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.ts";
import { getTrustedOrigins } from "./lib/trusted-origins.ts";
import { mastra } from "./mastra/index.ts";
import { chatRoutes } from "./routes/chat.ts";
import { researchJsonRoutes } from "./routes/research-json.ts";
import { researchRoutes } from "./routes/research.ts";
import { threadRoutes } from "./routes/threads.ts";
import { firecrawlWebhookRoutes } from "./routes/webhooks/firecrawl.ts";

const trustedOrigins = getTrustedOrigins();

// ---------------------------------------------------------------------------
// Root app — owns CORS, request logging, and route composition.
// Mastra gets its own sub-app so its middleware stays scoped.
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

app.use(
	"/*",
	cors({
		origin: (origin) => {
			if (!origin) {
				return trustedOrigins[0];
			}
			if (trustedOrigins.includes(origin)) {
				return origin;
			}
			return undefined;
		},
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"Cookie",
			"X-Requested-With",
		],
		exposeHeaders: ["Content-Length", "Set-Cookie"],
		credentials: true,
		maxAge: 600,
	}),
);

app.use("*", async (c, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	await next();
	const durationMs = Date.now() - start;
	const statusCode = c.res.status;
	logger.info({ method, path, statusCode, durationMs }, "request");
});

// ---------------------------------------------------------------------------
// Auth (Better Auth handler — standalone, no Mastra involvement)
// ---------------------------------------------------------------------------

app.on(["GET", "POST", "OPTIONS"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

// ---------------------------------------------------------------------------
// Webhooks — signature-verified, no session auth
// ---------------------------------------------------------------------------

app.route("/webhooks/firecrawl", firecrawlWebhookRoutes);

// ---------------------------------------------------------------------------
// Mastra — isolated sub-app so its global middleware (context parsing,
// auth in production) does not bleed into custom routes above.
// ---------------------------------------------------------------------------

const mastraApp = new Hono<{
	Bindings: HonoBindings;
	Variables: HonoVariables;
}>();
const mastraServer = new MastraServer({ app: mastraApp, mastra });
await mastraServer.init();
app.route("/", mastraApp);

// ---------------------------------------------------------------------------
// Custom API routes — session-authenticated via their own middleware
// ---------------------------------------------------------------------------

const appWithRoutes = app
	.route("/", threadRoutes)
	.route("/", chatRoutes)
	.route("/", researchJsonRoutes);

export type AppType = typeof appWithRoutes;

/**
 * SSE research routes are mounted at runtime but intentionally NOT folded
 * into `AppType`. The SSE stream endpoint (`/research/:threadId/stream`)
 * returns a bare `Response` via `streamSSE` which breaks Hono's RPC
 * inference — adding it collapses `AppType` to a shape `hc<AppType>`
 * cannot resolve. The web app talks to this endpoint via `EventSource`.
 *
 * JSON research endpoints live in `researchJsonRoutes` and ARE part of
 * `AppType` for typed RPC access.
 */
appWithRoutes.route("/", researchRoutes);

export default appWithRoutes;
