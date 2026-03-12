import { registerApiRoute } from "@mastra/core/server";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";

export const listThreadsRoute = registerApiRoute("/threads", {
  method: "GET",
  handler: async (c) => {
    const mastra = c.get("mastra");
    const resourceId = c.req.query("resourceId") || "default-patient";
    const agent = mastra.getAgent("triageAgent");
    const memory = await agent.getMemory();
    if (!memory) {
      return c.json({ threads: [], total: 0, hasMore: false });
    }

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
});

export const getThreadMessagesRoute = registerApiRoute(
  "/threads/:threadId/messages",
  {
    method: "GET",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const threadId = c.req.param("threadId");
      const resourceId = c.req.query("resourceId") || "default-patient";
      const agent = mastra.getAgent("triageAgent");
      const memory = await agent.getMemory();
      if (!memory) {
        return c.json({ messages: [] });
      }

      const thread = await memory.getThreadById({ threadId });

      if (!thread) {
        return c.json({ messages: [] });
      }

      const result = await memory.recall({
        threadId,
        resourceId,
        perPage: false,
      });

      return c.json({
        messages: toAISdkV5Messages(result.messages),
      });
    },
  },
);

export const deleteThreadRoute = registerApiRoute("/threads/:threadId", {
  method: "DELETE",
  handler: async (c) => {
    const mastra = c.get("mastra");
    const threadId = c.req.param("threadId");
    const agent = mastra.getAgent("triageAgent");
    const memory = await agent.getMemory();
    if (!memory) {
      return c.json({ success: false }, 500);
    }

    await memory.deleteThread(threadId);
    return c.json({ success: true });
  },
});
