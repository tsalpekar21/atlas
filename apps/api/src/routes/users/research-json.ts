import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireSessionMiddleware } from "../../middleware/require-session.ts";
import { getDebugSnapshotsForThread } from "../../services/debug.ts";
import {
	getLatestCompletedRound,
	listResearchHistory,
} from "../../services/research.ts";
import type { AppEnv } from "../../types.ts";

const threadParamSchema = z.object({
	threadId: z.string().min(1),
});

/**
 * JSON research endpoints included in `AppType` so the web app can call
 * them via the typed Hono RPC client. SSE endpoints live separately in
 * `research.ts` because `streamSSE` breaks RPC type inference.
 */
export const researchJsonRoutes = new Hono<AppEnv>()
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
			const { threadId } = c.req.valid("param");
			const snapshots = await getDebugSnapshotsForThread(threadId);
			return c.json({ snapshots });
		},
	);
