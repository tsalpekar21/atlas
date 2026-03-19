import type { MiddlewareHandler } from "hono";

/**
 * When `API_TOKEN` is set, require `Authorization: Bearer <token>`.
 * If unset, all requests pass (local/dev without auth).
 */
export const bearerAuthMiddleware: MiddlewareHandler = async (c, next) => {
	const token = process.env.API_TOKEN;
	if (!token) {
		await next();
		return;
	}
	if (c.req.header("Authorization") !== `Bearer ${token}`) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
};
