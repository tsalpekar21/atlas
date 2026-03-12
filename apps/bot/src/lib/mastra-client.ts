import {
  listThreadsResponseSchema,
  getThreadMessagesResponseSchema,
  deleteThreadResponseSchema,
  type ListThreadsResponse,
  type GetThreadMessagesResponse,
  type DeleteThreadResponse,
} from "@atlas/schemas/api";
import type { ZodType } from "zod";

const MASTRA_SERVER_URL =
  process.env.MASTRA_SERVER_URL || "http://localhost:4111";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.MASTRA_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MASTRA_API_TOKEN}`;
  }
  return headers;
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${MASTRA_SERVER_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });

  if (!res.ok) {
    throw new Error(
      `Mastra API error: ${res.status} ${res.statusText} on ${path}`,
    );
  }

  const json = await res.json();
  return schema.parse(json);
}

export const mastraClient = {
  listThreads(resourceId: string): Promise<ListThreadsResponse> {
    return request(
      `/threads?resourceId=${encodeURIComponent(resourceId)}`,
      listThreadsResponseSchema,
    );
  },

  getThreadMessages(
    threadId: string,
    resourceId: string,
  ): Promise<GetThreadMessagesResponse> {
    return request(
      `/threads/${encodeURIComponent(threadId)}/messages?resourceId=${encodeURIComponent(resourceId)}`,
      getThreadMessagesResponseSchema,
    );
  },

  deleteThread(threadId: string): Promise<DeleteThreadResponse> {
    return request(
      `/threads/${encodeURIComponent(threadId)}`,
      deleteThreadResponseSchema,
      { method: "DELETE" },
    );
  },

  chatUrl(): string {
    return `${MASTRA_SERVER_URL}/chat`;
  },
} as const;
