import { getThreadMessagesResponseSchema } from "@atlas/schemas/api";
import { Hono } from "hono";
import { buildChatUiResponse } from "../services/chat.ts";
import { requireSessionMiddleware } from "../middleware/require-session.ts";
import type { AppEnv } from "../types.ts";
import {
	deleteThreadById,
	getThreadMessagesForResource,
	listThreadsForResource,
} from "../services/triage.ts";

export const triageRoutes = new Hono<AppEnv>()
	.use("*", requireSessionMiddleware)
	.get("/threads", async (c) => {
		const mastra = c.get("mastra");
		const userId = c.get("userId");
		const data = await listThreadsForResource(mastra, userId);
		return c.json(data);
	})
	.get("/threads/:threadId/messages", async (c) => {
		const mastra = c.get("mastra");
		const threadId = c.req.param("threadId");
		const userId = c.get("userId");
		const data = await getThreadMessagesForResource(mastra, threadId, userId);
		const body = getThreadMessagesResponseSchema.parse(data);
		return c.json(body);
	})
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
		const userId = c.get("userId");
		const body = await c.req.json();
		try {
			return await buildChatUiResponse(mastra, body, userId);
		} catch {
			return c.json({ error: "Failed to start chat stream" }, 500);
		}
	});
