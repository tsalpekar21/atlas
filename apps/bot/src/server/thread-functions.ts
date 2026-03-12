import { createServerFn } from "@tanstack/react-start";

const MASTRA_SERVER_URL =
  process.env.MASTRA_SERVER_URL || "http://localhost:4111";
const RESOURCE_ID = "default-patient";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.MASTRA_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MASTRA_API_TOKEN}`;
  }
  return headers;
}

interface ThreadSummary {
  id: string;
  title: string;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
}

export const listThreads = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await fetch(
      `${MASTRA_SERVER_URL}/threads?resourceId=${RESOURCE_ID}`,
      { headers: authHeaders() },
    );
    const data = await res.json();
    return data as {
      threads: ThreadSummary[];
      total: number;
      hasMore: boolean;
    };
  },
);

export const getThreadMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(
      `${MASTRA_SERVER_URL}/threads/${data.threadId}/messages?resourceId=${RESOURCE_ID}`,
      { headers: authHeaders() },
    );
    return (await res.json()) as { messages: object[] };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(`${MASTRA_SERVER_URL}/threads/${data.threadId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const json = await res.json();
    return json as { success: boolean };
  });
