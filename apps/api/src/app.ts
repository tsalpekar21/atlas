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
import { threadRoutes } from "./routes/threads.ts";

const trustedOrigins = getTrustedOrigins();

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

app.on(["GET", "POST", "OPTIONS"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

const server = new MastraServer({ app, mastra });

await server.init();

app.use("*", async (c, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	await next();
	const durationMs = Date.now() - start;
	const statusCode = c.res.status;
	logger.info({ method, path, statusCode, durationMs }, "request");
});

const appWithRoutes = app.route("/", threadRoutes).route("/", chatRoutes);

export type AppType = typeof appWithRoutes;
export default appWithRoutes;
