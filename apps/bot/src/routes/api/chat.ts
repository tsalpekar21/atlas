import { createFileRoute } from "@tanstack/react-router";

const MASTRA_SERVER_URL =
  process.env.MASTRA_SERVER_URL || "http://localhost:4111";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const response = await fetch(`${MASTRA_SERVER_URL}/chat`, {
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
