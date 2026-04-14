import { listAdminWebsitesResponseSchema } from "@atlas/schemas/api";
import { Hono } from "hono";
import { listAdminWebsites } from "../../services/admin/websites.ts";
import type { AppEnv } from "../../types.ts";

// No .use(requireAdminMiddleware) here — applied at the parent adminApp level.
export const adminWebsiteRoutes = new Hono<AppEnv>().get(
	"/websites",
	async (c) => {
		const websites = await listAdminWebsites();
		const body = listAdminWebsitesResponseSchema.parse({ websites });
		return c.json(body);
	},
);
