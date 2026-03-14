import { serve } from "@hono/node-server";
import "dotenv/config";
import app from "./app";

const port = process.env.PORT ? parseInt(process.env.PORT) : 4111;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
