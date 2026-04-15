// MUST be the first import. Initializes `@atlas/logger` before any other
// module is loaded — workflows and agents create child loggers at module
// scope and the proxy throws if `initialize()` has not run yet.
import "./bootstrap.ts";

import { logger } from "@atlas/logger";
import { serve } from "@hono/node-server";
import app from "./app.ts";
import { env } from "./env.ts";
import { ensureDevelopmentQueuesExist } from "./tasks/setup.ts";

const port = env.PORT;
serve({ fetch: app.fetch, port }, (info) => {
	logger.info(
		{ port: info.port },
		`Hono server running on http://localhost:${info.port}`,
	);
});

void ensureDevelopmentQueuesExist();
