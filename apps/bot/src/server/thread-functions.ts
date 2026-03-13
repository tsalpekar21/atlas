import { mastraClient } from "@/lib/mastra-client";
import { createServerFn } from "@tanstack/react-start";

const RESOURCE_ID = "default-patient";

export const listThreads = createServerFn({ method: "GET" }).handler(
  async () => {
    return mastraClient.listThreads(RESOURCE_ID);
  },
);

// UIMessage contains deeply-nested `unknown` types (metadata, tool input/output)
// that are incompatible with TanStack Start's serializable return constraint.
// The data is JSON from the Mastra API so it serializes fine at runtime.
export const getThreadMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const { messages } = await mastraClient.getThreadMessages(
      data.threadId,
      RESOURCE_ID,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return messages as any;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    return mastraClient.deleteThread(data.threadId);
  });
