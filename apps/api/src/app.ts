import { Hono } from "hono";
import {
  type HonoBindings,
  type HonoVariables,
  MastraServer,
} from "@mastra/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { mastra } from "./mastra";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

const server = new MastraServer({ app, mastra });
await server.init();

const routes = app
  .get(
    "/threads",
    zValidator("query", z.object({ resourceId: z.string().optional() })),
    async (c) => {
      const mastra = c.get("mastra");
      const { resourceId = "default-patient" } = c.req.valid("query");
      const agent = mastra.getAgent("triageAgent");
      const memory = await agent.getMemory();
      if (!memory) return c.json({ threads: [], total: 0, hasMore: false });
      const result = await memory.listThreads({
        filter: { resourceId },
        orderBy: { field: "createdAt", direction: "DESC" },
        perPage: 50,
      });
      return c.json({
        threads: result.threads.map((t) => ({
          id: t.id,
          title: t.title,
          resourceId: t.resourceId,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        total: result.total,
        hasMore: result.hasMore,
      });
    },
  )
  .get(
    "/threads/:threadId/messages",
    zValidator("query", z.object({ resourceId: z.string().optional() })),
    async (c) => {
      const mastra = c.get("mastra");
      const threadId = c.req.param("threadId");
      const { resourceId = "default-patient" } = c.req.valid("query");
      const agent = mastra.getAgent("triageAgent");
      const memory = await agent.getMemory();
      if (!memory) return c.json({ messages: [] });
      const thread = await memory.getThreadById({ threadId });
      if (!thread) return c.json({ messages: [] });
      const result = await memory.recall({
        threadId,
        resourceId,
        perPage: false,
      });
      return c.json({ messages: toAISdkV5Messages(result.messages) });
    },
  )
  .delete("/threads/:threadId", async (c) => {
    const mastra = c.get("mastra");
    const threadId = c.req.param("threadId");
    const agent = mastra.getAgent("triageAgent");
    const memory = await agent.getMemory();
    if (!memory) return c.json({ success: false }, 500);
    await memory.deleteThread(threadId);
    return c.json({ success: true });
  })
  .post("/chat", async (c) => {
    const mastra = c.get("mastra");
    const body = await c.req.json();
    const stream = await handleChatStream({
      mastra,
      agentId: "triageAgent",
      params: body,
    });
    return createUIMessageStreamResponse({
      stream: stream as Parameters<
        typeof createUIMessageStreamResponse
      >[0]["stream"],
    });
  });

export type AppType = typeof routes;
export default app;
