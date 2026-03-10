import { createServerFn } from "@tanstack/react-start";
import { mastra } from "@/mastra/index";
import type { MastraMessagePart } from "@mastra/core/agent/message-list";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { TriageMessage } from "@/mastra/tools/triage-types";

const RESOURCE_ID = "default-patient";

async function getMemory() {
  const agent = mastra.getAgent("triageAgent");
  const memory = await agent.getMemory();
  if (!memory) {
    throw new Error("Triage agent memory is not configured");
  }
  return memory;
}

export const listThreads = createServerFn({ method: "GET" }).handler(
  async () => {
    const memory = await getMemory();
    const result = await memory.listThreads({
      filter: { resourceId: RESOURCE_ID },
      orderBy: { field: "createdAt", direction: "DESC" },
      perPage: 50,
    });
    return {
      threads: result.threads.map((t) => ({
        id: t.id,
        title: t.title,
        resourceId: t.resourceId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      total: result.total,
      hasMore: result.hasMore,
    };
  },
);

export type SerializedMessage = {
  id: string;
  role: string;
  createdAt: string;
  content: { format?: number; parts?: MastraMessagePart[] };
};

export const getThreadMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const memory = await getMemory();
    const result = await memory.recall({
      threadId: data.threadId,
      resourceId: RESOURCE_ID,
      perPage: false,
    });

    return {
      messages: toAISdkV5Messages(result.messages),
    };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const memory = await getMemory();
    await memory.deleteThread(data.threadId);
    return { success: true };
  });
