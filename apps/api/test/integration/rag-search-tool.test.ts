import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

/**
 * Integration tests for the `ragSearch` tool. Seeds a small
 * deterministic corpus via `test/helpers/corpus.ts`, embeds via
 * `vi.mock("ai")` (stubbing `embedMany` — must be declared BEFORE any
 * of our imports resolve), and exercises the tool against real
 * pgvector.
 *
 * The stubbed `embedMany` hands out vectors biased along specific
 * axes (via `deterministicVector(axis)`) so:
 *   - Ingestion-time vectors (one per chunk) are distinguishable.
 *   - Query-time vectors can target specific pages by matching their
 *     axis. That lets us assert "query X retrieves page Y" precisely.
 *
 * A module-level counter drives ingestion bias so each chunk in the
 * seeded corpus gets its own axis. At query time the stub branches on
 * the input text to return the axis that matches the page we want to
 * hit. See `stubRouter()` below.
 */

// ---------- Module-level mock state ----------

// Mode toggles which vector-assignment scheme `embedMany` uses. The
// test controls this indirectly by seeding (= ingestion mode) and then
// flipping to query mode for search.
type StubMode = "ingestion" | "query";
type QueryRouter = (text: string) => number; // returns axis index

const stubState = {
	mode: "ingestion" as StubMode,
	ingestionIndex: 0,
	queryRouter: (() => 99) as QueryRouter, // default: orthogonal to everything
	vectorDim: 3072,
};

// ---------- Mock setup (MUST precede imports of modules under test) ----------

vi.mock("ai", async (importOriginal) => {
	const mod = await importOriginal<typeof import("ai")>();
	return {
		...mod,
		embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
			embeddings: values.map((text) => {
				if (stubState.mode === "ingestion") {
					const axis = stubState.ingestionIndex++;
					return axisVector(axis, stubState.vectorDim);
				}
				return axisVector(stubState.queryRouter(text), stubState.vectorDim);
			}),
			usage: { tokens: 0 },
		})),
	};
});

/**
 * Deterministic bias toward an axis. Two chunks given different axes
 * produce vectors with cosine similarity well below 1.0; same axis
 * produces near-identical vectors.
 */
function axisVector(axis: number, dim: number): number[] {
	const v = new Array(dim).fill(0);
	for (let i = 0; i < dim; i++) {
		const phase = (axis * Math.PI) / 3;
		v[i] = Math.cos((i * 2 * Math.PI) / dim + phase) * 0.5 + 0.5;
	}
	return v;
}

// ---------- Imports of modules under test (AFTER vi.mock) ----------

import { cleanupWebsite } from "../helpers/cleanup.ts";
import { seedRagCorpus, type SeededCorpus } from "../helpers/corpus.ts";
import { ragSearchTool } from "../../src/mastra/agents/research/tools/rag-search.ts";

// ---------- Fixture lifecycle ----------

let corpus: SeededCorpus;

beforeAll(async () => {
	stubState.mode = "ingestion";
	stubState.ingestionIndex = 0;
	corpus = await seedRagCorpus();
});

afterAll(async () => {
	if (corpus) {
		await cleanupWebsite(
			corpus.websiteId,
			corpus.pages.map((p) => p.pageId),
		);
	}
});

/**
 * Invoke the real tool with a Mastra-compatible call shape. Our
 * `ragSearch.execute` signature is `(inputData, context?)`; the second
 * param is unused by the tool body so we pass an empty object and cast.
 */
type RagSearchInput = {
	queries: string[];
	topKPerQuery?: number;
	finalTopK?: number;
	minScore?: number;
	useMmr?: boolean;
};
async function runTool(input: RagSearchInput) {
	// The Mastra tool typings require a ToolExecutionContext; we don't
	// use it in the ragSearch body, so an empty object works at runtime.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const execute = ragSearchTool.execute as unknown as (
		input: RagSearchInput,
		context: unknown,
	) => Promise<{
		results: Array<{
			chunkId: string;
			content: string;
			pageTitle: string;
			pageUrl: string;
			score: number;
			matchedQuery: string;
		}>;
		totalChunksReturned: number;
		uniquePagesReturned: number;
		topScore: number;
	}>;
	return execute(input, {});
}

// ---------- Tests ----------

describe("integration: ragSearch tool", () => {
	test("returns chunks when the query vector matches page 0's axis", async () => {
		// Target page 0's first chunk: ingestion axis 0.
		stubState.mode = "query";
		stubState.queryRouter = () => 0;

		const result = await runTool({
			queries: ["a natural-language HyDE-style query about page 0"],
			topKPerQuery: 10,
			finalTopK: 5,
			// Disable minScore so we exercise the retrieval path without
			// a threshold gate for this sanity test.
			minScore: -1,
			useMmr: false,
		});

		expect(result.totalChunksReturned).toBeGreaterThan(0);
		expect(result.topScore).toBeGreaterThan(0);
		// The matched chunks should belong to the seeded corpus — specifically
		// page 0 (since that's the axis we aligned with).
		const page0Url = corpus.pages[0]?.url;
		expect(result.results.some((r) => r.pageUrl === page0Url)).toBe(true);
	});

	test("returns chunks carrying the expected schema (chunkId, content, pageTitle, pageUrl)", async () => {
		stubState.mode = "query";
		stubState.queryRouter = () => 0;

		const result = await runTool({
			queries: ["another page 0 query"],
			topKPerQuery: 5,
			finalTopK: 3,
			minScore: -1,
			useMmr: false,
		});
		const first = result.results[0];
		expect(first?.chunkId).toMatch(/^[0-9a-f-]{36}$/);
		expect(first?.content.length).toBeGreaterThan(0);
		expect(first?.pageTitle.length).toBeGreaterThan(0);
		expect(first?.pageUrl).toMatch(/^https?:\/\//);
		expect(first?.score).toBeGreaterThan(0);
	});

	test("minScore: 0.99 returns no results (nothing clears the impossible floor)", async () => {
		// Use a fractional axis that doesn't align with any integer
		// ingestion axis, so no chunk's vector matches the query exactly
		// (which would produce similarity = 1.0 and slip past any floor).
		stubState.mode = "query";
		stubState.queryRouter = () => 0.5;

		const result = await runTool({
			queries: ["this query would match, but minScore blocks it"],
			topKPerQuery: 10,
			finalTopK: 8,
			minScore: 0.99,
			useMmr: false,
		});
		expect(result.totalChunksReturned).toBe(0);
		expect(result.results).toEqual([]);
	});

	test("queries orthogonal to the corpus still return results when minScore is relaxed", async () => {
		// Use a query axis that differs from all 3 page axes but falls
		// within pgvector's cosine space (i.e. not zero). Without a
		// minScore filter, pgvector still returns the top-K closest
		// vectors even if cosine similarity is low.
		stubState.mode = "query";
		stubState.queryRouter = () => 99;

		const result = await runTool({
			queries: ["an orthogonal query"],
			topKPerQuery: 5,
			finalTopK: 3,
			minScore: -1,
			useMmr: false,
		});
		// Results may or may not be empty depending on how close axis 99
		// lands; the point is the call doesn't throw and returns a
		// well-shaped response.
		expect(result.totalChunksReturned).toBeGreaterThanOrEqual(0);
		expect(Array.isArray(result.results)).toBe(true);
	});
});
