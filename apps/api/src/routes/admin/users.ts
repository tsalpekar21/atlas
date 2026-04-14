import { Hono } from "hono";
import { listAllUsers } from "../../services/admin/users.ts";
import type { AppEnv } from "../../types.ts";

// No .use(requireAdminMiddleware) here — applied at the parent adminApp level.
export const adminUserRoutes = new Hono<AppEnv>().get("/users", async (c) => {
	const users = await listAllUsers();
	return c.json({ users });
});
