import { zValidator } from "@hono/zod-validator";
import type { HonoBindings, HonoVariables } from "@mastra/hono";
import { Hono } from "hono";
import { z } from "zod";
import { buildChatUiResponse } from "../services/chat.ts";
import { requireSessionMiddleware } from "../middleware/require-session.ts";
import {
	deleteThreadById,
	getThreadMessagesForResource,
	listThreadsForResource,
} from "../services/triage.ts";

export const triageRoutes = new Hono<{
	Bindings: HonoBindings;
	Variables: HonoVariables;
}>()
	.use("*", requireSessionMiddleware)
	.get(
		"/threads",
		zValidator("query", z.object({ resourceId: z.string().optional() })),
		async (c) => {
			const mastra = c.get("mastra");
			const { resourceId = "default-patient" } = c.req.valid("query");
			const data = await listThreadsForResource(mastra, resourceId);
			return c.json(data);
		},
	)
	.get(
		"/threads/:threadId/messages",
		zValidator("query", z.object({ resourceId: z.string().optional() })),
		async (c) => {
			const mastra = c.get("mastra");
			const threadId = c.req.param("threadId");
			const { resourceId = "default-patient" } = c.req.valid("query");
			const data = await getThreadMessagesForResource(
				mastra,
				threadId,
				resourceId,
			);
			return c.json(data);
		},
	)
	.delete("/threads/:threadId", async (c) => {
		const mastra = c.get("mastra");
		const threadId = c.req.param("threadId");
		const result = await deleteThreadById(mastra, threadId);
		if (!result.success) {
			return c.json({ success: false }, 500);
		}
		return c.json({ success: true });
	})
	.post("/chat", async (c) => {
		const mastra = c.get("mastra");
		const body = await c.req.json();
		return buildChatUiResponse(mastra, body);
	});
