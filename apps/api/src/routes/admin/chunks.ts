import {
	embedWebsiteResponseSchema,
	listPageChunksResponseSchema,
} from "@atlas/schemas/api";
import { Hono } from "hono";
import { listPageChunks } from "../../services/admin/chunks.ts";
import { enqueue } from "../../tasks/enqueue.ts";
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
		// Enqueue via Cloud Tasks; the queue handles retries and the admin UI
		// polls chunks.status to surface progress.
		await enqueue("embedPage", { pageId });
		const body = embedWebsiteResponseSchema.parse({ started: true });
		return c.json(body, 202);
	});
