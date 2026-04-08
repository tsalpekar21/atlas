import { initialize, logger } from "@atlas/logger";
import { serve } from "@hono/node-server";
import app from "./app.ts";
import { env } from "./env.ts";

initialize({
	applicationEnvironment:
		env.NODE_ENV === "production" ? "production" : "development",
});

const port = env.PORT;
serve({ fetch: app.fetch, port }, (info) => {
	logger.info(
		{ port: info.port },
		`Hono server running on http://localhost:${info.port}`,
	);
});
