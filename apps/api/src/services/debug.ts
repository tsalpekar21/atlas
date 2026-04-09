import { logger } from "@atlas/logger";
import type { Mastra } from "@mastra/core/mastra";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { messageDebugSnapshots, researchFindings } from "../db/schema.ts";
import {
	getLatestCompletedRound,
	getThreadChart,
	type ResearchSynthesis,
} from "./research.ts";
import { HEALTH_ASSISTANT_AGENT_ID } from "./threads/constants.ts";

const debugLog = logger.child({ component: "debug.snapshot" });

/**
 * Per-message debug snapshot returned to the web debug panel.
 * `researchRound` is the most recent COMPLETED round at the time this
 * message was generated — i.e. the one the assistant actually consumed
 * via the `getLatestResearch` tool for this turn.
 */
export type DebugSnapshotPayload = {
	messageId: string;
	threadId: string;
	createdAt: string;
	workingMemory: string | null;
	researchRound: {
		id: string;
		createdAt: string;
		brief: unknown;
		synthesis: ResearchSynthesis | null;
		evidenceItems: unknown;
		suggestedQuestions: unknown;
		escalationFlags: unknown;
		workerOutputs: ResearchSynthesis["workerOutputs"] | null;
	} | null;
};

/**
 * Capture a debug snapshot for the most recent assistant message on a
 * thread. Called from the chat stream flush hook AFTER the stream has
 * finished but BEFORE a new research round is enqueued — that ordering
 * ensures we record the round the agent was actually looking at on this
 * turn, not the one about to start.
 *
 * Must never throw: debug snapshotting is developer-facing introspection,
 * not a critical path. Logs on failure and moves on.
 */
export async function snapshotMessageDebug(args: {
	mastra: Mastra;
	threadId: string;
	userId: string;
}): Promise<void> {
	const { mastra, threadId, userId } = args;
	try {
		const agent = mastra.getAgent(HEALTH_ASSISTANT_AGENT_ID);
		const memory = await agent.getMemory();
		if (!memory) {
			debugLog.warn({ threadId }, "no memory — skipping snapshot");
			return;
		}

		// Find the most recent assistant message on the thread. `perPage:
		// false` returns everything; we walk from the end because that's
		// the turn we just finished streaming.
		const recalled = await memory.recall({
			threadId,
			resourceId: userId,
			perPage: false,
		});
		const messages = recalled.messages;
		let assistantMessageId: string | null = null;
		for (let i = messages.length - 1; i >= 0; i--) {
			const m = messages[i] as { id?: string; role?: string };
			if (m.role === "assistant" && typeof m.id === "string") {
				assistantMessageId = m.id;
				break;
			}
		}
		if (!assistantMessageId) {
			debugLog.warn(
				{ threadId },
				"no assistant message found — skipping snapshot",
			);
			return;
		}

		const [workingMemory, latestRound] = await Promise.all([
			getThreadChart(mastra, threadId, userId),
			getLatestCompletedRound(threadId),
		]);

		await db
			.insert(messageDebugSnapshots)
			.values({
				messageId: assistantMessageId,
				threadId,
				workingMemory: workingMemory || null,
				researchRoundId: latestRound?.id ?? null,
			})
			.onConflictDoUpdate({
				target: messageDebugSnapshots.messageId,
				set: {
					workingMemory: workingMemory || null,
					researchRoundId: latestRound?.id ?? null,
				},
			});

		debugLog.info(
			{
				threadId,
				messageId: assistantMessageId,
				hasWorkingMemory: Boolean(workingMemory),
				researchRoundId: latestRound?.id ?? null,
			},
			"snapshot written",
		);
	} catch (err) {
		debugLog.error({ err, threadId }, "snapshot failed");
	}
}

/**
 * Fetch every debug snapshot for a thread, joining the pointed-to
 * research round so the UI has everything it needs in one round-trip.
 */
export async function getDebugSnapshotsForThread(
	threadId: string,
): Promise<DebugSnapshotPayload[]> {
	const rows = await db
		.select({
			snapshot: messageDebugSnapshots,
			round: researchFindings,
		})
		.from(messageDebugSnapshots)
		.leftJoin(
			researchFindings,
			eq(messageDebugSnapshots.researchRoundId, researchFindings.id),
		)
		.where(eq(messageDebugSnapshots.threadId, threadId))
		.orderBy(desc(messageDebugSnapshots.createdAt));

	return rows.map(({ snapshot, round }) => {
		const synthesis = (round?.synthesis ?? null) as ResearchSynthesis | null;
		return {
			messageId: snapshot.messageId,
			threadId: snapshot.threadId,
			createdAt: snapshot.createdAt.toISOString(),
			workingMemory: snapshot.workingMemory,
			researchRound: round
				? {
						id: round.id,
						createdAt: round.createdAt.toISOString(),
						brief: round.brief,
						synthesis,
						evidenceItems: round.evidenceItems,
						suggestedQuestions: round.suggestedQuestions,
						escalationFlags: round.escalationFlags,
						workerOutputs: synthesis?.workerOutputs ?? null,
					}
				: null,
		};
	});
}
