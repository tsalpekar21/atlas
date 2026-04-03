import { logger } from "@atlas/logger";
import {
	type HonoBindings,
	type HonoVariables,
	MastraServer,
} from "@mastra/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { mastra } from "./mastra/index.ts";
import { bearerAuthMiddleware } from "./middleware/bearer-auth.ts";
import { triageRoutes } from "./routes/triage.ts";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

app.use("/*", cors());

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

app.use("*", bearerAuthMiddleware);

const appWithRoutes = app.route("/", triageRoutes);

export type AppType = typeof appWithRoutes;
export default appWithRoutes;
