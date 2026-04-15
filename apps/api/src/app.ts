import { honoHttpLogger, logger, runWithRequestContext } from "@atlas/logger";
import {
	type HonoBindings,
	type HonoVariables,
	MastraServer,
} from "@mastra/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { auth } from "./auth.ts";
import { getTrustedOrigins } from "./lib/trusted-origins.ts";
import { mastra } from "./mastra/index.ts";
import { adminApp } from "./routes/admin/index.ts";
import { chatRoutes } from "./routes/users/chat.ts";
import { researchRoutes } from "./routes/users/research.ts";
import { researchJsonRoutes } from "./routes/users/research-json.ts";
import { threadRoutes } from "./routes/users/threads.ts";
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
		origin: trustedOrigins,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		credentials: true,
		maxAge: 600,
	}),
);

app.use("*", requestId());
app.use("*", (c, next) =>
	runWithRequestContext({ requestId: c.var.requestId }, next),
);
app.use("*", honoHttpLogger());

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
const mastraServer = new MastraServer({
	app: mastraApp,
	mastra,
});
await mastraServer.init();
app.route("/", mastraApp);

// ---------------------------------------------------------------------------
// Custom API routes — session-authenticated via their own middleware
// ---------------------------------------------------------------------------

const appWithRoutes = app
	.route("/", threadRoutes)
	.route("/", chatRoutes)
	.route("/", researchJsonRoutes);

appWithRoutes.get("/", (c) => {
	return c.json({ ok: true });
});

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

/**
 * Admin routes — mounted at `/admin/*`, guarded by `requireAdminMiddleware`
 * at the sub-app level. Intentionally NOT folded into `AppType` so admin
 * shapes cannot leak into the public `hc<AppType>` RPC client used by the
 * web app. Admin UIs use a dedicated typed `hc<AdminAppType>` client (see
 * `apps/web/src/lib/admin/admin-api-client.ts`), which is why we re-export
 * `AdminAppType` here as a separate symbol.
 */
appWithRoutes.route("/admin", adminApp);

appWithRoutes.onError((err, c) => {
	logger.error(
		{ err, method: c.req.method, path: c.req.path },
		"unhandled exception",
	);
	return c.json({ error: "Internal server error" }, 500);
});

export type { AdminAppType } from "./routes/admin/index.ts";

export default appWithRoutes;
