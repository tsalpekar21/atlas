import type { MiddlewareHandler } from "hono";
import { auth } from "../auth.ts";

/** Require a Better Auth session. Mount only on routes that should be protected. */
export const requireSessionMiddleware: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};
