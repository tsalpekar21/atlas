import { mastraClient } from "@/lib/mastra-client";
import { createServerFn } from "@tanstack/react-start";

const RESOURCE_ID = "default-patient";

export const listThreads = createServerFn({ method: "GET" }).handler(
  async () => {
    return mastraClient.listThreads(RESOURCE_ID);
  },
);

export const getThreadMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    return mastraClient.getThreadMessages(data.threadId, RESOURCE_ID);
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    return mastraClient.deleteThread(data.threadId);
  });
