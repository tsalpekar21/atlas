import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { env } from "../env.ts";
import {
	subscribeResearchStatus,
	type ResearchStatusEvent,
} from "../inngest/realtime-bus.ts";
import { requireSessionMiddleware } from "../middleware/require-session.ts";
import { getDebugSnapshotsForThread } from "../services/debug.ts";
import {
	getLatestCompletedRound,
	listResearchHistory,
} from "../services/research.ts";
import type { AppEnv } from "../types.ts";

const threadParamSchema = z.object({
	threadId: z.string().min(1),
});

/**
 * SSE heartbeat interval so the connection stays open through proxies and
 * the browser knows the server is still alive between workflow steps.
 */
const HEARTBEAT_MS = 15_000;

export const researchRoutes = new Hono<AppEnv>()
	.use("*", requireSessionMiddleware)
	/** Compact history list — the triage tool reads the latest directly via the service. */
	.get(
		"/research/:threadId",
		zValidator("param", threadParamSchema),
		async (c) => {
			const { threadId } = c.req.valid("param");
			const [history, latest] = await Promise.all([
				listResearchHistory(threadId),
				getLatestCompletedRound(threadId),
			]);
			return c.json({
				history: history.map((row) => ({
					...row,
					createdAt: row.createdAt.toISOString(),
				})),
				latest: latest
					? {
							id: latest.id,
							createdAt: latest.createdAt.toISOString(),
							status: latest.status,
							whatChanged: latest.whatChanged,
							suggestedQuestions: latest.suggestedQuestions,
							evidenceItems: latest.evidenceItems,
							escalationFlags: latest.escalationFlags,
						}
					: null,
			});
		},
	)
	/**
	 * SSE bridge: proxies research status events from the in-process
	 * `realtime-bus` EventEmitter out to the browser. The chat UI subscribes
	 * on mount and renders a small "Researching…" indicator while rounds are
	 * in flight.
	 */
	/**
	 * Dev-only debug endpoint: returns every per-message snapshot for a
	 * thread joined with its research round data. The web debug panel
	 * calls this once per thread load and matches results to messages
	 * by id client-side. Gated on NODE_ENV so production builds can't
	 * expose it even if the route is mounted.
	 */
	.get(
		"/debug/:threadId/snapshots",
		zValidator("param", threadParamSchema),
		async (c) => {
			if (env.NODE_ENV === "production") {
				return c.json({ error: "debug disabled" }, 404);
			}
			const { threadId } = c.req.valid("param");
			const snapshots = await getDebugSnapshotsForThread(threadId);
			return c.json({ snapshots });
		},
	)
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
