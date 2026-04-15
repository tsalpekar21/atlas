import { logger } from "@atlas/logger";
import {
	embedWebsiteResponseSchema,
	listPageChunksResponseSchema,
} from "@atlas/schemas/api";
import { Hono } from "hono";
import { listPageChunks } from "../../services/admin/chunks.ts";
import { embedPage } from "../../services/chunks/embed-page.ts";
import type { AppEnv } from "../../types.ts";

// No .use(requireAdminMiddleware) here — applied at the parent adminApp level.
export const adminChunkRoutes = new Hono<AppEnv>()
	.get("/pages/:id/chunks", async (c) => {
		const rows = await listPageChunks(c.req.param("id"));
		const body = listPageChunksResponseSchema.parse({ chunks: rows });
		return c.json(body);
	})
	.post("/pages/:id/embed", async (c) => {
		const pageId = c.req.param("id");
		// Fire-and-forget; per-page failures are surfaced via chunks.status.
		void embedPage(pageId).catch((err) => {
			logger.error({ err, pageId }, "embedPage: background task failed");
		});
		const body = embedWebsiteResponseSchema.parse({ started: true });
		return c.json(body, 202);
	});
