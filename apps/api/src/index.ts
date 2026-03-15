import "dotenv/config";
import { serve } from "@hono/node-server";
import { initialize, logger } from "@atlas/logger";
import app from "./app.ts";

initialize({
  applicationEnvironment:
    process.env.NODE_ENV === "production" ? "production" : "development",
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 4111;
serve({ fetch: app.fetch, port }, (info) => {
  logger.info(
    { port: info.port },
    `Hono server running on http://localhost:${info.port}`,
  );
});
