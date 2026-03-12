import { registerApiRoute } from "@mastra/core/server";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";

export const chatRoute = registerApiRoute("/chat", {
  method: "POST",
  handler: async (c) => {
    const mastra = c.get("mastra");
    const body = await c.req.json();
    const stream = await handleChatStream({
      mastra,
      agentId: "triageAgent",
      params: body,
    });
    return createUIMessageStreamResponse({ stream });
  },
});
