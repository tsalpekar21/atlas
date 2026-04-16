import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * Integration tests for the workflow's skip / bail paths. Each test
 * exercises a specific early-exit in the pipeline:
 *
 *   1. loadContext    — empty chart → bail immediately, no row
 *   2. gateByHash     — unchanged chart → skipped row inserted
 *   3. extractBrief   — chart with no focus items → skipped row
 *
 * Agents are NOT mocked here; the workflow bails before reaching the
 * parallel-worker block in all three cases, so LLM calls never happen.
 * `embedMany` is still stubbed to rule out any transitive Google API
 * call during module init (see embed-page.test.ts pattern).
 */

vi.mock("ai", async (importOriginal) => {
	const mod = await importOriginal<typeof import("ai")>();
	return {
		...mod,
		embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
			embeddings: values.map(() => new Array(3072).fill(0.1)),
			usage: { tokens: 0 },
		})),
	};
});

import { db } from "../../src/db/index.ts";
import { researchFindings } from "../../src/db/schema.ts";
import { mastra } from "../../src/mastra/index.ts";
import {
	CHART_WITHOUT_FOCUS_ITEMS,
	TRIAGE_CHART_WITH_HYPOTHESES,
} from "../../src/test-helpers/charts.ts";
import { seedWorkingMemory } from "../helpers/memory.ts";

let activeThreads: string[] = [];
const nextThread = () => {
	const id = `skip-test-${randomUUID()}`;
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

async function runWorkflow(threadId: string, userId: string) {
	const workflow = mastra.getWorkflow("backgroundResearch");
	const run = await workflow.createRun();
	return run.start({ inputData: { threadId, userId } });
}

async function getRows(threadId: string) {
	return db
		.select()
		.from(researchFindings)
		.where(eq(researchFindings.threadId, threadId))
		.orderBy(asc(researchFindings.createdAt));
}

describe("integration: workflow skip paths", () => {
	test("empty chart → load-context bails with no DB row", async () => {
		const threadId = nextThread();
		// Intentionally don't seed working memory — `getThreadChart`
		// returns empty string.

		const result = await runWorkflow(threadId, threadId);

		// Workflow "success" here is a synonym for "didn't throw"; the
		// bail path returns status: "skipped" via its own output.
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.result?.status).toBe("skipped");
			expect(result.result?.reason).toBe("empty-chart");
		}

		// No row inserted — load-context bails before insert-running.
		const rows = await getRows(threadId);
		expect(rows).toHaveLength(0);
	});

	test("chart with no focus items → extract-brief bails + inserts skipped row", async () => {
		const threadId = nextThread();
		await seedWorkingMemory({
			mastra,
			threadId,
			chart: CHART_WITHOUT_FOCUS_ITEMS,
		});

		const result = await runWorkflow(threadId, threadId);

		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.result?.status).toBe("skipped");
			// Reason text comes from `extractBriefFromChart` — the planner
			// deterministically reports "no focus items or red flags".
			expect(result.result?.reason).toMatch(/no focus items/i);
		}

		const rows = await getRows(threadId);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.status).toBe("skipped");
		expect(rows[0]?.whatChanged).toMatch(/no focus items/i);
	});

	test("unchanged chart hash → gate-by-hash bails on second run", async () => {
		const threadId = nextThread();
		await seedWorkingMemory({
			mastra,
			threadId,
			chart: TRIAGE_CHART_WITH_HYPOTHESES,
		});

		// First run: insert a completed round with a known hash. We don't
		// actually want to invoke the workers (they'd hit PubMed), so
		// short-circuit by manually inserting a row that looks like a
		// previous completion.
		const { computeChartHash, insertRunningRound, markRoundComplete } =
			await import("../../src/services/research.ts");
		const priorId = await insertRunningRound({
			threadId,
			userId: threadId,
			chartHash: computeChartHash(TRIAGE_CHART_WITH_HYPOTHESES),
			brief: {
				mode: "triage",
				context: "",
				focusItems: [],
				unknowns: [],
				researchQuestions: [],
				riskLevel: "routine",
			},
		});
		await markRoundComplete({
			id: priorId,
			synthesis: {
				evidenceItems: [],
				suggestedQuestions: [],
				escalationFlags: [],
				openQuestions: [],
				whatChanged: "prior",
			},
		});

		// Now run the workflow. The chart is unchanged, so gate-by-hash
		// should see the matching hash and bail.
		const result = await runWorkflow(threadId, threadId);

		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.result?.status).toBe("skipped");
			expect(result.result?.reason).toBe("chart-unchanged");
		}

		const rows = await getRows(threadId);
		// Prior completed row + new skipped row.
		expect(rows).toHaveLength(2);
		expect(rows[0]?.status).toBe("complete");
		expect(rows[1]?.status).toBe("skipped");
	});
});
