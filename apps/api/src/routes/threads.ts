import { getThreadMessagesResponseSchema } from "@atlas/schemas/api";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireSessionMiddleware } from "../middleware/require-session.ts";
import { deleteThreadById } from "../services/threads/delete-thread.ts";
import { getThreadMessagesForResource } from "../services/threads/get-thread-messages.ts";
import { listThreadsForResource } from "../services/threads/list-threads.ts";
import type { AppEnv } from "../types.ts";

const threadParamSchema = z.object({
	threadId: z.string().min(1),
});

export const threadRoutes = new Hono<AppEnv>()
	.use("*", requireSessionMiddleware)
	.get("/threads", async (c) => {
		const mastra = c.get("mastra");
		const userId = c.get("userId");
		const data = await listThreadsForResource(mastra, userId);
		return c.json(data);
	})
	.get(
		"/threads/:threadId/messages",
		zValidator("param", threadParamSchema),
		async (c) => {
			const mastra = c.get("mastra");
			const { threadId } = c.req.valid("param");
			const userId = c.get("userId");
			const data = await getThreadMessagesForResource(mastra, threadId, userId);
			const body = getThreadMessagesResponseSchema.parse(data);
			return c.json(body);
		},
	)
	.delete(
		"/threads/:threadId",
		zValidator("param", threadParamSchema),
		async (c) => {
			const mastra = c.get("mastra");
			const { threadId } = c.req.valid("param");
			const result = await deleteThreadById(mastra, threadId);
			if (!result.success) {
				return c.json({ success: false }, 500);
			}
			return c.json({ success: true });
		},
	);
