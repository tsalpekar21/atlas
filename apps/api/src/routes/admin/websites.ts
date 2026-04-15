import { logger } from "@atlas/logger";
import {
	adminWebsiteDetailResponseSchema,
	embedWebsiteResponseSchema,
	listAdminWebsitesResponseSchema,
} from "@atlas/schemas/api";
import { Hono } from "hono";
import {
	getAdminWebsiteDetail,
	listAdminWebsites,
} from "../../services/admin/websites.ts";
import { reembedWebsite } from "../../services/chunks/embed-page.ts";
import type { AppEnv } from "../../types.ts";

// No .use(requireAdminMiddleware) here — applied at the parent adminApp level.
export const adminWebsiteRoutes = new Hono<AppEnv>()
	.get("/websites", async (c) => {
		const websites = await listAdminWebsites();
		const body = listAdminWebsitesResponseSchema.parse({ websites });
		return c.json(body);
	})
	.get("/websites/:id", async (c) => {
		const detail = await getAdminWebsiteDetail(c.req.param("id"));
		if (!detail) {
			return c.json({ error: "Website not found" }, 404);
		}
		const body = adminWebsiteDetailResponseSchema.parse(detail);
		return c.json(body);
	})
	.post("/websites/:id/embed", async (c) => {
		const websiteId = c.req.param("id");
		// Fire-and-forget so the admin UI returns immediately; failures are
		// per-page and surfaced via chunks.status in later GETs.
		void reembedWebsite(websiteId).catch((err) => {
			logger.error(
				{ err, websiteId },
				"reembedWebsite: background task failed",
			);
		});
		const body = embedWebsiteResponseSchema.parse({ started: true });
		return c.json(body, 202);
	});
