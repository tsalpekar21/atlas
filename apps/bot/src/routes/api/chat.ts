import { createFileRoute } from "@tanstack/react-router";
import { createUIMessageStreamResponse } from "ai";
import { mastra } from "@/mastra/index";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const { handleChatStream } = await import("@mastra/ai-sdk");
        const stream = await handleChatStream({
          mastra,
          agentId: "triageAgent",
          params: body,
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
