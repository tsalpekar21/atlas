import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, test } from "vitest";
import { db } from "../../src/db/index.ts";
import { researchFindings } from "../../src/db/schema.ts";
import {
	getLastCompletedHash,
	getLatestCompletedRound,
	getRunningRound,
	insertRunningRound,
	insertSkippedRound,
	listResearchHistory,
	markRoundComplete,
	markRoundFailed,
	type PlannerBrief,
	type ResearchSynthesis,
} from "../../src/services/research.ts";

/**
 * Integration tests for the `research_findings` lifecycle CRUD ops in
 * `services/research.ts`. Runs against the containerised Postgres
 * started by `test/integration/global-setup.ts`, exercising real
 * Drizzle migrations and JSONB coercion.
 *
 * Each test uses a unique threadId so parallel runs don't collide;
 * `afterEach` cleans up everything created under the current test's
 * threadId.
 */

let activeThreads: string[] = [];
const nextThread = () => {
	const id = `db-ops-test-${randomUUID()}`;
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
		context: "[mode: triage] test user context",
		focusItems: [
			{
				label: "TestHypothesis",
				kind: "hypothesis",
				systems: ["assimilation"],
				confidence: 0.6,
				notes: ["note"],
			},
		],
		unknowns: [],
		researchQuestions: [],
		riskLevel: "routine",
	};
}

function sampleSynthesis(): ResearchSynthesis {
	return {
		evidenceItems: [
			{
				claim: "supporting evidence",
				source: "PMID 1 | J | 2024",
				sourceQuality: "guideline",
				relationship: "supports",
				hypothesis: "TestHypothesis",
				facts: ["fact 1"],
				confidence: 0.9,
			},
		],
		suggestedQuestions: ["question?"],
		escalationFlags: [],
		openQuestions: ["unknown?"],
		whatChanged: "nothing earth-shattering",
	};
}

describe("integration: research_findings CRUD lifecycle", () => {
	test("insertRunningRound + getRunningRound roundtrip", async () => {
		const threadId = nextThread();
		const roundId = await insertRunningRound({
			threadId,
			userId: "test-user",
			chartHash: "hash-abc",
			brief: sampleBrief(),
		});
		expect(roundId).toMatch(/^[0-9a-f-]{36}$/);

		const running = await getRunningRound(threadId);
		expect(running?.id).toBe(roundId);

		// Row shape: confirm fields we care about
		const rows = await db
			.select()
			.from(researchFindings)
			.where(eq(researchFindings.id, roundId));
		expect(rows[0]?.status).toBe("running");
		expect(rows[0]?.chartHash).toBe("hash-abc");
		expect(rows[0]?.brief).toMatchObject({ mode: "triage" });
	});

	test("markRoundComplete flips status and flattens evidence/questions/flags", async () => {
		const threadId = nextThread();
		const roundId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h",
			brief: sampleBrief(),
		});

		const synth = sampleSynthesis();
		await markRoundComplete({ id: roundId, synthesis: synth });

		const [row] = await db
			.select()
			.from(researchFindings)
			.where(eq(researchFindings.id, roundId));
		expect(row?.status).toBe("complete");
		expect(row?.synthesis).toMatchObject({ whatChanged: synth.whatChanged });
		expect(row?.evidenceItems).toEqual(synth.evidenceItems);
		expect(row?.suggestedQuestions).toEqual(synth.suggestedQuestions);
		expect(row?.escalationFlags).toEqual(synth.escalationFlags);
		expect(row?.whatChanged).toBe(synth.whatChanged);

		// After completion there's no longer a "running" round
		expect(await getRunningRound(threadId)).toBeNull();
	});

	test("getLatestCompletedRound returns the newest completed row", async () => {
		const threadId = nextThread();
		const r1 = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h1",
			brief: sampleBrief(),
		});
		await markRoundComplete({ id: r1, synthesis: sampleSynthesis() });
		// Simulate a newer round
		await new Promise((r) => setTimeout(r, 5));
		const r2 = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h2",
			brief: sampleBrief(),
		});
		await markRoundComplete({ id: r2, synthesis: sampleSynthesis() });

		const latest = await getLatestCompletedRound(threadId);
		expect(latest?.id).toBe(r2);
		expect(latest?.chartHash).toBe("h2");
	});

	test("getLastCompletedHash returns the chartHash of the latest completed round", async () => {
		const threadId = nextThread();
		const rid = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "hash-xyz",
			brief: sampleBrief(),
		});
		await markRoundComplete({ id: rid, synthesis: sampleSynthesis() });

		expect(await getLastCompletedHash(threadId)).toBe("hash-xyz");
	});

	test("getLastCompletedHash returns null when no completed round exists", async () => {
		const threadId = nextThread();
		expect(await getLastCompletedHash(threadId)).toBeNull();
	});

	test("markRoundFailed flips status and persists errorMessage", async () => {
		const threadId = nextThread();
		const roundId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h",
			brief: sampleBrief(),
		});
		await markRoundFailed({ id: roundId, error: "synth exploded" });

		const [row] = await db
			.select()
			.from(researchFindings)
			.where(eq(researchFindings.id, roundId));
		expect(row?.status).toBe("failed");
		expect(row?.errorMessage).toBe("synth exploded");
		expect(await getRunningRound(threadId)).toBeNull();
	});

	test("insertSkippedRound creates a skipped row with a reason", async () => {
		const threadId = nextThread();
		await insertSkippedRound({
			threadId,
			userId: "u",
			chartHash: "h",
			reason: "chart unchanged since last round",
		});
		const [row] = await db
			.select()
			.from(researchFindings)
			.where(eq(researchFindings.threadId, threadId));
		expect(row?.status).toBe("skipped");
		expect(row?.whatChanged).toBe("chart unchanged since last round");
	});

	test("listResearchHistory returns compact summaries ordered by createdAt desc with limit", async () => {
		const threadId = nextThread();
		for (let i = 0; i < 3; i++) {
			const id = await insertRunningRound({
				threadId,
				userId: "u",
				chartHash: `h${i}`,
				brief: sampleBrief(),
			});
			await markRoundComplete({ id, synthesis: sampleSynthesis() });
			await new Promise((r) => setTimeout(r, 5));
		}

		const history = await listResearchHistory(threadId, 2);
		expect(history).toHaveLength(2);
		// Newest first
		expect(history[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(
			history[1]?.createdAt.getTime() ?? 0,
		);
	});

	test("getLatestCompletedRound ignores running/failed/skipped rows", async () => {
		const threadId = nextThread();
		// Insert a skipped (newer) and a completed (older)
		const completedId = await insertRunningRound({
			threadId,
			userId: "u",
			chartHash: "h-complete",
			brief: sampleBrief(),
		});
		await markRoundComplete({
			id: completedId,
			synthesis: sampleSynthesis(),
		});
		await new Promise((r) => setTimeout(r, 5));
		await insertSkippedRound({
			threadId,
			userId: "u",
			chartHash: "h-skipped",
			reason: "chart unchanged",
		});

		const latest = await getLatestCompletedRound(threadId);
		expect(latest?.id).toBe(completedId);
		expect(latest?.chartHash).toBe("h-complete");
	});
});
