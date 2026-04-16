import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";

/**
 * End-to-end integration test for `backgroundResearchWorkflow`. Boots
 * the real Mastra workflow engine against the real containerised DB
 * + pgvector, but stubs the 4 LLM agent calls (guideline, literature,
 * rag, synthesizer) with deterministic canned responses so the test
 * is hermetic and fast (~5-10s per case).
 *
 * The rag worker's `ragSearch` tool is NOT stubbed — it runs against
 * the real pgvector + a seeded corpus so `retrievedChunkIds` is
 * populated with real chunk UUIDs and `computeRagMetrics` exercises
 * its adoption-rate logic end-to-end.
 */

// ---------- Mocks (must declare BEFORE imports of modules under test) ----------

// Ingestion vs query vector routing for embedMany (both the seed
// pipeline and the rag tool's query path).
type StubMode = "ingestion" | "query";
const stubState = {
	mode: "ingestion" as StubMode,
	ingestionIndex: 0,
};

function axisVector(axis: number, dim = 3072): number[] {
	const v = new Array(dim).fill(0);
	for (let i = 0; i < dim; i++) {
		const phase = (axis * Math.PI) / 3;
		v[i] = Math.cos((i * 2 * Math.PI) / dim + phase) * 0.5 + 0.5;
	}
	return v;
}

vi.mock("ai", async (importOriginal) => {
	const mod = await importOriginal<typeof import("ai")>();
	return {
		...mod,
		embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
			embeddings: values.map(() => {
				if (stubState.mode === "ingestion") {
					return axisVector(stubState.ingestionIndex++);
				}
				// Query phase: align with page-0's axis so we always retrieve
				// at least one chunk from the seeded corpus.
				return axisVector(0);
			}),
			usage: { tokens: 0 },
		})),
	};
});

// ---------- Imports (after vi.mock) ----------

import { db } from "../../src/db/index.ts";
import { researchFindings } from "../../src/db/schema.ts";
import { mastra } from "../../src/mastra/index.ts";
import { TRIAGE_CHART_WITH_HYPOTHESES } from "../../src/test-helpers/charts.ts";
import { cleanupWebsite } from "../helpers/cleanup.ts";
import { seedRagCorpus, type SeededCorpus } from "../helpers/corpus.ts";
import { seedWorkingMemory } from "../helpers/memory.ts";
import {
	cannedEvidenceItems,
	cannedSynthesisJson,
	mockAgentGenerate,
} from "../helpers/mock-agent.ts";

// ---------- Corpus fixture ----------

let corpus: SeededCorpus;

beforeAll(async () => {
	stubState.mode = "ingestion";
	stubState.ingestionIndex = 0;
	corpus = await seedRagCorpus();
	stubState.mode = "query";
});

afterAll(async () => {
	if (corpus) {
		await cleanupWebsite(
			corpus.websiteId,
			corpus.pages.map((p) => p.pageId),
		);
	}
});

// ---------- Per-test thread lifecycle ----------

let activeThreads: string[] = [];
const nextThread = () => {
	const id = `wf-test-${randomUUID()}`;
	activeThreads.push(id);
	return id;
};

afterEach(async () => {
	vi.restoreAllMocks();
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

// ---------- Helpers ----------

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

/**
 * Mock the 3 worker agents + synthesizer with canned responses tuned
 * to the test case. Must be called before `runWorkflow` for each
 * test — restoreAllMocks in afterEach nukes the spies.
 */
function mockAllAgents(options: {
	corpusChunkIds: string[];
	corpusPageTitle?: string;
	synthesisOverride?: string;
}) {
	mockAgentGenerate(mastra, "guidelineResearcher", () => ({
		text: cannedEvidenceItems({
			sourceQuality: "guideline",
			labels: ["SIBO"],
		}),
	}));
	mockAgentGenerate(mastra, "literatureResearcher", () => ({
		text: cannedEvidenceItems({
			sourceQuality: "peer-reviewed",
			labels: ["SIBO"],
		}),
	}));
	// Rag researcher emits EVIDENCE ITEMS that cite the seeded chunkIds
	// AND includes a simulated tool-call trace so `extractRetrievedChunkIds`
	// can pick them up from `result.steps[0].toolResults`.
	mockAgentGenerate(mastra, "ragResearcher", () => ({
		text: cannedEvidenceItems({
			sourceQuality: "functional-medicine-corpus",
			labels: ["SIBO"],
			chunkIds: options.corpusChunkIds,
			pageTitle: options.corpusPageTitle,
		}),
		toolResults: [
			{
				toolName: "ragSearch",
				output: {
					results: options.corpusChunkIds.map((id) => ({ chunkId: id })),
				},
			},
		],
	}));
	mockAgentGenerate(mastra, "researchSynthesizer", () => ({
		text:
			options.synthesisOverride ??
			cannedSynthesisJson({
				focusLabel: "SIBO",
				corpusChunkIds: options.corpusChunkIds,
				corpusPageTitle: options.corpusPageTitle,
			}),
	}));
}

// ---------- Tests ----------

describe("integration: background-research workflow end-to-end", () => {
	test("happy path — workflow completes, writes synthesis, computes ragMetrics", async () => {
		const threadId = nextThread();
		await seedWorkingMemory({
			mastra,
			threadId,
			chart: TRIAGE_CHART_WITH_HYPOTHESES,
		});

		// Pick the first 2 chunks of page 0 as the "cited" chunks so
		// ragMetrics has something non-trivial to compute.
		const page0 = corpus.pages[0];
		if (!page0) throw new Error("corpus missing page 0");
		const corpusChunkIds = page0.chunkIds.slice(0, 2);
		mockAllAgents({
			corpusChunkIds,
			corpusPageTitle: page0.title,
		});

		const result = await runWorkflow(threadId, threadId);

		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.result?.status).toBe("complete");
			expect(result.result?.roundId).toMatch(/^[0-9a-f-]{36}$/);
		}

		const rows = await getRows(threadId);
		expect(rows).toHaveLength(1);
		const row = rows[0];
		expect(row?.status).toBe("complete");

		// Synthesis persisted with the full jsonb payload.
		const synth = row?.synthesis as Record<string, unknown> | null;
		expect(synth).not.toBeNull();
		expect(synth?.whatChanged).toBeDefined();

		// Worker outputs all three present.
		const workerOutputs = synth?.workerOutputs as Record<string, string>;
		expect(workerOutputs.guideline.length).toBeGreaterThan(0);
		expect(workerOutputs.literature.length).toBeGreaterThan(0);
		expect(workerOutputs.rag.length).toBeGreaterThan(0);

		// ragMetrics populated with real adoption numbers.
		const ragMetrics = synth?.ragMetrics as {
			retrieved: number;
			cited: number;
			adoptionRate: number;
			uniquePagesCited: number;
		};
		expect(ragMetrics).toBeDefined();
		expect(ragMetrics.retrieved).toBe(corpusChunkIds.length);
		expect(ragMetrics.cited).toBeGreaterThan(0);
		expect(ragMetrics.adoptionRate).toBeGreaterThan(0);
		expect(ragMetrics.uniquePagesCited).toBeGreaterThan(0);

		// evidenceItems has at least one functional-medicine-corpus entry.
		const evidence = row?.evidenceItems as Array<{ sourceQuality?: string }>;
		expect(evidence.length).toBeGreaterThan(0);
		expect(
			evidence.some(
				(e) => e.sourceQuality === "functional-medicine-corpus",
			),
		).toBe(true);
	});

	test("one worker fails — workflow still completes with empty rag workerText", async () => {
		const threadId = nextThread();
		await seedWorkingMemory({
			mastra,
			threadId,
			chart: TRIAGE_CHART_WITH_HYPOTHESES,
		});

		// Happy path for guideline + literature + synth, but rag worker
		// throws to exercise the "worker failed — returning empty" branch.
		mockAgentGenerate(mastra, "guidelineResearcher", () => ({
			text: cannedEvidenceItems({
				sourceQuality: "guideline",
				labels: ["SIBO"],
			}),
		}));
		mockAgentGenerate(mastra, "literatureResearcher", () => ({
			text: cannedEvidenceItems({
				sourceQuality: "peer-reviewed",
				labels: ["SIBO"],
			}),
		}));
		vi.spyOn(mastra.getAgent("ragResearcher"), "generate").mockRejectedValue(
			new Error("rag agent transient fault"),
		);
		mockAgentGenerate(mastra, "researchSynthesizer", () => ({
			text: cannedSynthesisJson({
				focusLabel: "SIBO",
				corpusChunkIds: [], // no corpus chunks cited → no ragMetrics
			}),
		}));

		const result = await runWorkflow(threadId, threadId);

		expect(result.status).toBe("success");
		const rows = await getRows(threadId);
		const row = rows[0];
		expect(row?.status).toBe("complete");

		const synth = row?.synthesis as Record<string, unknown>;
		const workerOutputs = synth?.workerOutputs as Record<string, string>;
		expect(workerOutputs.guideline.length).toBeGreaterThan(0);
		expect(workerOutputs.literature.length).toBeGreaterThan(0);
		expect(workerOutputs.rag).toBe("");

		// No chunks retrieved → ragMetrics omitted.
		expect(synth?.ragMetrics).toBeUndefined();
	});

	test("synthesizer emits unparseable output — round still marked complete with minimal synthesis", async () => {
		const threadId = nextThread();
		await seedWorkingMemory({
			mastra,
			threadId,
			chart: TRIAGE_CHART_WITH_HYPOTHESES,
		});

		const page0 = corpus.pages[0];
		if (!page0) throw new Error("corpus missing page 0");
		mockAllAgents({
			corpusChunkIds: page0.chunkIds.slice(0, 1),
			corpusPageTitle: page0.title,
			synthesisOverride: "this is not JSON at all, just prose",
		});

		const result = await runWorkflow(threadId, threadId);

		expect(result.status).toBe("success");
		const rows = await getRows(threadId);
		const row = rows[0];
		expect(row?.status).toBe("complete");

		// `parseSynthesisJson` fell back to the minimal shape.
		const synth = row?.synthesis as Record<string, unknown>;
		expect(synth?.whatChanged).toMatch(/unparseable/i);
		expect((row?.evidenceItems as unknown[]) ?? []).toEqual([]);
	});
});
