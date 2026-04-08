import { chatRequestSchema } from "@atlas/schemas/api";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireSessionMiddleware } from "../middleware/require-session.ts";
import { buildChatUiResponse } from "../services/chat.ts";
import type { AppEnv } from "../types.ts";

export const chatRoutes = new Hono<AppEnv>()
	.use("*", requireSessionMiddleware)
	.post("/chat", zValidator("json", chatRequestSchema), async (c) => {
		const mastra = c.get("mastra");
		const userId = c.get("userId");
		const body = c.req.valid("json");
		try {
			return await buildChatUiResponse(mastra, body, userId);
		} catch {
			return c.json({ error: "Failed to start chat stream" }, 500);
		}
	});
