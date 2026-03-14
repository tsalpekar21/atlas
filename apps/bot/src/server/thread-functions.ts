import { api } from "@/lib/mastra-client";
import { createServerFn } from "@tanstack/react-start";

const RESOURCE_ID = "default-patient";

export const listThreads = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await api.threads.$get({
      query: { resourceId: RESOURCE_ID },
    });
    return res.json();
  },
);

// UIMessage contains deeply-nested `unknown` types (metadata, tool input/output)
// that are incompatible with TanStack Start's serializable return constraint.
// The data is JSON from the Mastra API so it serializes fine at runtime.
export const getThreadMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const res = await api.threads[":threadId"].messages.$get({
      param: { threadId: data.threadId },
      query: { resourceId: RESOURCE_ID },
    });
    const { messages } = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return messages as any;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const res = await api.threads[":threadId"].$delete({
      param: { threadId: data.threadId },
    });
    return res.json();
  });
