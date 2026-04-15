import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireCloudTasksAuth } from "./middleware.ts";
import { queues } from "./registry.ts";

/**
 * Builds a Hono sub-app from the queue registry. Every queue gets a
 * `POST` route at its declared path (stripped of the `/tasks` prefix
 * since this app is mounted under `/tasks` in app.ts). The HMAC
 * middleware runs first on every request.
 */
export function createTasksRouter(): Hono {
	const app = new Hono();
	app.use("*", requireCloudTasksAuth);

	for (const queue of Object.values(queues)) {
		const localPath = queue.path.replace(/^\/tasks/, "") || "/";
		app.post(localPath, zValidator("json", queue.schema), async (c) => {
			const payload = c.req.valid("json");
			return queue.handler(payload, c);
		});
	}

	return app;
}
