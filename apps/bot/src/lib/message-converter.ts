import type { SerializedMessage } from "@/server/thread-functions";
import type { TriageMessage } from "@/mastra/tools/triage-types";

export function mastraToUIMessages(
  dbMessages: SerializedMessage[],
): TriageMessage[] {
  return dbMessages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => {
      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: msg.content.parts ?? [],
        createdAt: new Date(msg.createdAt),
      } as TriageMessage;
    });
}
