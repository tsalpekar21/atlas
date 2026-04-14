import { logger } from "@atlas/logger";
import type { MiddlewareHandler } from "hono";
import { auth } from "../auth.ts";
import type { AppEnv } from "../types.ts";

// Returns 404 instead of 401/403 so admin route existence cannot be probed by
// unauthenticated or non-admin callers. Applied at the admin sub-app level —
// never on individual routes — so it cannot be forgotten.
export const requireAdminMiddleware: MiddlewareHandler<AppEnv> = async (
	c,
	next,
) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session) {
		return c.json({ error: "Not found" }, 404);
	}

	if (session.user.role !== "admin") {
		logger.warn(
			{ userId: session.user.id, path: c.req.path },
			"Non-admin attempted to access admin route",
		);
		return c.json({ error: "Not found" }, 404);
	}

	c.set("userId", session.user.id);
	await next();
};
