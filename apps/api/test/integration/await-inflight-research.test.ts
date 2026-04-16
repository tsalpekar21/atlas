import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, test } from "vitest";
import { db } from "../../src/db/index.ts";
import { researchFindings } from "../../src/db/schema.ts";
import { publishResearchStatus } from "../../src/inngest/realtime-bus.ts";
import {
	awaitInflightResearch,
	insertRunningRound,
	markRoundComplete,
	type PlannerBrief,
	type ResearchSynthesis,
} from "../../src/services/research.ts";

/**
 * Integration tests for `awaitInflightResearch` — the function chat
 * turns call to block on an in-flight research round before streaming
 * the assistant response. Exercises the EventEmitter wait path, the
 * immediate-return path (no round running), and the timeout fallback.
 */

let activeThreads: string[] = [];
const nextThread = () => {
	const id = `await-test-${randomUUID()}`;
	activeThreads.push(id);
	return id;
};

afterEach(async () => {
	for (const threadId of activeThreads) {
		try {
			await db
				.delete(researchFindings)
				.where(eq(researchFindings.threadId, threadId));
		} catch {
			// best-effort
		}
	}
	activeThreads = [];
});

function sampleBrief(): PlannerBrief {
	return {
		mode: "triage",
		context: "test",
		focusItems: [
			{
				label: "TestHyp",
				kind: "hypothesis",
				systems: [],
				confidence: 0.5,
				notes: [],
			},
		],
		unknowns: [],
		researchQuestions: [],
		riskLevel: "routine",
	};
}

function sampleSynthesis(): ResearchSynthesis {
	return {
		evidenceItems: [],
		suggestedQuestions: [],
		escalationFlags: [],
		openQuestions: [],
		whatChanged: "test synthesis",
	};
}

describe("integration: awaitInflightResearch", () => {
	test("returns the latest completed round immediately when nothing is running", async () => {
		const threadId = nextThread();
		const roundId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-complete",
			brief: sampleBrief(),
		});
		await markRoundComplete({ id: roundId, synthesis: sampleSynthesis() });

		const started = Date.now();
		const result = await awaitInflightResearch(threadId);
		const elapsedMs = Date.now() - started;

		expect(result?.id).toBe(roundId);
		expect(result?.status).toBe("complete");
		// No running round → no wait. Should return fast (single DB query).
		expect(elapsedMs).toBeLessThan(1000);
	});

	test("returns null when the thread has no rounds at all", async () => {
		const threadId = nextThread();
		const result = await awaitInflightResearch(threadId);
		expect(result).toBeNull();
	});

	test("waits for a running round and resolves when complete status is published", async () => {
		const threadId = nextThread();
		const roundId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-pending",
			brief: sampleBrief(),
		});

		// Kick off the await; it will see the running round and subscribe.
		// Schedule a completion publish slightly later.
		const completePromise = (async () => {
			// Small delay so the subscriber is definitely registered before
			// we publish. Without this the race condition would cause the
			// publish to fire before the listener exists.
			await new Promise((r) => setTimeout(r, 50));
			await markRoundComplete({ id: roundId, synthesis: sampleSynthesis() });
			publishResearchStatus(threadId, { status: "complete", roundId });
		})();

		const [waitResult] = await Promise.all([
			awaitInflightResearch(threadId, 3_000),
			completePromise,
		]);

		expect(waitResult?.id).toBe(roundId);
		expect(waitResult?.status).toBe("complete");
	});

	test("resolves on 'failed' status even when the row is not in complete state", async () => {
		const threadId = nextThread();
		const roundId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-failed",
			brief: sampleBrief(),
		});

		const completePromise = (async () => {
			await new Promise((r) => setTimeout(r, 50));
			// Leave row in 'running' state intentionally — we just need
			// the publish to wake the subscriber so the await returns.
			publishResearchStatus(threadId, { status: "failed", roundId });
		})();

		const [waitResult] = await Promise.all([
			awaitInflightResearch(threadId, 3_000),
			completePromise,
		]);

		// Row is still 'running', no completed round exists, so the
		// service returns null after the publish wakes it.
		expect(waitResult).toBeNull();
	});

	test("times out and returns best-available data (null) when no status event fires", async () => {
		const threadId = nextThread();
		await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-timeout",
			brief: sampleBrief(),
		});

		const started = Date.now();
		const result = await awaitInflightResearch(threadId, 200);
		const elapsedMs = Date.now() - started;

		// Nothing completed, so we get null from getLatestCompletedRound.
		expect(result).toBeNull();
		// Timeout was honored (allow generous slack for slow CI).
		expect(elapsedMs).toBeGreaterThanOrEqual(150);
		expect(elapsedMs).toBeLessThan(2000);
	});

	test("timeout returns the latest completed round if one exists", async () => {
		const threadId = nextThread();
		// Prior completed round
		const oldId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-old",
			brief: sampleBrief(),
		});
		await markRoundComplete({ id: oldId, synthesis: sampleSynthesis() });
		// New running round that will never publish
		await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-new",
			brief: sampleBrief(),
		});

		const result = await awaitInflightResearch(threadId, 200);
		// Fell back to the previous completed round rather than null.
		expect(result?.id).toBe(oldId);
		expect(result?.chartHash).toBe("h-old");
	});
});
