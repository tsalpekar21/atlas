import { mastraClient } from "@/lib/mastra-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const response = await fetch(mastraClient.chatUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.MASTRA_API_TOKEN && {
              Authorization: `Bearer ${process.env.MASTRA_API_TOKEN}`,
            }),
          },
          body,
        });

        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") || "text/event-stream",
          },
        });
      },
    },
  },
});
