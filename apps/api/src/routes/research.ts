import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import {
	type ResearchStatusEvent,
	subscribeResearchStatus,
} from "../inngest/realtime-bus.ts";
import { requireSessionMiddleware } from "../middleware/require-session.ts";
import type { AppEnv } from "../types.ts";

const threadParamSchema = z.object({
	threadId: z.string().min(1),
});

/**
 * SSE heartbeat interval so the connection stays open through proxies and
 * the browser knows the server is still alive between workflow steps.
 */
const HEARTBEAT_MS = 15_000;

/**
 * SSE-only research routes. These are intentionally kept out of `AppType`
 * because `streamSSE` returns a bare `Response` that breaks Hono's RPC
 * type inference. The web app talks to this endpoint via `EventSource`.
 *
 * JSON research endpoints live in `research-json.ts` and are part of
 * `AppType` for typed RPC access.
 */
export const researchRoutes = new Hono<AppEnv>()
	.use("*", requireSessionMiddleware)
	/**
	 * SSE bridge: proxies research status events from the in-process
	 * `realtime-bus` EventEmitter out to the browser. The chat UI subscribes
	 * on mount and renders a small "Researching…" indicator while rounds are
	 * in flight.
	 */
	.get(
		"/research/:threadId/stream",
		zValidator("param", threadParamSchema),
		async (c) => {
			const { threadId } = c.req.valid("param");
			return streamSSE(c, async (stream) => {
				const queue: ResearchStatusEvent[] = [];
				let waiter: (() => void) | null = null;

				const unsubscribe = subscribeResearchStatus(threadId, (event) => {
					queue.push(event);
					waiter?.();
				});

				const heartbeat = setInterval(() => {
					stream.writeSSE({ event: "ping", data: "" }).catch(() => {});
				}, HEARTBEAT_MS);

				stream.onAbort(() => {
					clearInterval(heartbeat);
					unsubscribe();
				});

				// Send an initial "connected" marker so the client can switch off
				// its loading state as soon as the stream opens.
				await stream.writeSSE({
					event: "connected",
					data: JSON.stringify({ threadId }),
				});

				try {
					while (!stream.aborted) {
						if (queue.length === 0) {
							await new Promise<void>((resolve) => {
								waiter = resolve;
							});
							waiter = null;
						}
						while (queue.length > 0) {
							const event = queue.shift();
							if (!event) continue;
							await stream.writeSSE({
								event: "status",
								data: JSON.stringify(event),
							});
						}
					}
				} finally {
					clearInterval(heartbeat);
					unsubscribe();
				}
			});
		},
	);
