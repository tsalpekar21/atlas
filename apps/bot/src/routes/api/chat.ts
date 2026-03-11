import { createFileRoute } from "@tanstack/react-router";
import { createUIMessageStreamResponse } from "ai";
import { mastra } from "@/mastra/index";
import { handleChatStream } from "@mastra/ai-sdk";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
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
