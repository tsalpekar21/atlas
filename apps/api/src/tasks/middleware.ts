import { logger } from "@atlas/logger";
import type { MiddlewareHandler } from "hono";
import { verifyBody } from "./sign.ts";

/**
 * Verifies the HMAC signature attached by `enqueue()` (or anything else
 * that knows the shared secret). The body is read as raw text and then
 * put back on the request via `c.req.raw` clone semantics so downstream
 * `zValidator("json", ...)` can still parse it.
 */
export const requireCloudTasksAuth: MiddlewareHandler = async (c, next) => {
	const signature = c.req.header("x-atlas-task-signature");
	if (!signature) {
		logger.warn("Cloud Tasks request missing signature header");
		return c.json({ error: "Missing task signature" }, 401);
	}
	const raw = await c.req.raw.clone().text();
	if (!verifyBody(raw, signature)) {
		logger.warn("Cloud Tasks request signature verification failed");
		return c.json({ error: "Invalid task signature" }, 401);
	}
	await next();
};
