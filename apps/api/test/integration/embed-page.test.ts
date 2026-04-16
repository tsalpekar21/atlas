import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";

/**
 * Integration test for the chunk + embedding pipeline. Exercises the real
 * `embedPage` service against the containerised Postgres (with pgvector)
 * started in `global-setup.ts`, and verifies two contracts:
 *
 *   1. Persistence: the Drizzle `chunks` rows end up with status=embedded
 *      and match what the Mastra chunker produced.
 *   2. PgVector metadata: the JSONB blob attached to each vector in the
 *      `page_chunks` index parses cleanly through `chunkVectorMetadataSchema`
 *      and carries `content` + `tokenCount` alongside the chunk/page/website
 *      IDs. This is the contract the eventual RAG UI relies on — so the test
 *      fails loudly if anyone strips those fields from the upsert call.
 *
 * `embedMany` from the `ai` SDK is stubbed so the test doesn't hit Google's
 * embedding API (the worker env uses a fake GOOGLE_GENERATIVE_AI_API_KEY).
 * The stub returns deterministic 3072-dim vectors — enough to satisfy
 * pgvector's `halfvec(3072)` column while keeping the test hermetic.
 */

// Stub BEFORE any module under test imports `ai`, so `embedMany` is the mock.
vi.mock("ai", async (importOriginal) => {
	const mod = await importOriginal<typeof import("ai")>();
	return {
		...mod,
		embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
			embeddings: values.map((_, rowIdx) =>
				// Deterministic but row-distinct so pgvector doesn't choke on
				// all-zero vectors. Values stay in [0, 1] which is valid for
				// halfvec.
				new Array(3072).fill(0).map((_, i) => ((i + rowIdx) % 97) / 100),
			),
			usage: { tokens: 0 },
		})),
	};
});

import { chunkVectorMetadataSchema } from "@atlas/schemas/api";
import { db } from "../../src/db/index.ts";
import {
	chunks,
	scrapedPages,
	scrapedWebsites,
} from "../../src/db/schema.ts";
import {
	CHUNKS_DIMENSION,
	CHUNKS_INDEX_NAME,
	pgVectorChunks,
} from "../../src/mastra/rag/page-chunks-store.ts";
import { embedPage } from "../../src/services/chunks/embed-page.ts";

describe("integration: embedPage + PgVector metadata contract", () => {
	let websiteId: string;
	let pageId: string;

	beforeAll(async () => {
		// The PgVector `page_chunks` index is created eagerly in
		// `worker-env.ts` before this file loads, so we don't need to
		// create it here — just insert the fixture rows.

		const suffix = randomUUID();
		const [website] = await db
			.insert(scrapedWebsites)
			.values({
				title: `Test Website ${suffix}`,
				rootDomain: `test-${suffix}.example.com`,
			})
			.returning({ id: scrapedWebsites.id });
		if (!website) throw new Error("failed to insert test website");
		websiteId = website.id;

		const [page] = await db
			.insert(scrapedPages)
			.values({
				url: `https://test-${suffix}.example.com/article`,
				scrapedWebsiteId: websiteId,
				// Intentionally long-ish markdown so the semantic-markdown
				// chunker produces >1 chunk. Keeping it well under the 512
				// char chunk size per section but with multiple headings so
				// the chunker has natural split points.
				markdown: [
					"# Integration test page",
					"",
					"This is the introduction section. It contains a reasonable amount of prose so the chunker has real text to work with.",
					"",
					"## Section one",
					"",
					"First section body. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
					"",
					"## Section two",
					"",
					"Second section body. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
					"",
					"## Section three",
					"",
					"Third section body. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
				].join("\n"),
			})
			.returning({ id: scrapedPages.id });
		if (!page) throw new Error("failed to insert test page");
		pageId = page.id;
	});

	afterAll(async () => {
		// CASCADE on scraped_websites → scraped_pages → chunks cleans up
		// the Drizzle rows. Clear the PgVector index entries too so repeated
		// runs against a persisted DB don't accumulate garbage.
		try {
			await pgVectorChunks.deleteVectors({
				indexName: CHUNKS_INDEX_NAME,
				filter: { scrapedPageId: pageId },
			});
		} catch {
			// best-effort — the DB rows (and cascaded chunks) are the source
			// of truth for the next test run.
		}
		if (websiteId) {
			await db
				.delete(scrapedWebsites)
				.where(eq(scrapedWebsites.id, websiteId));
		}
	});

	test("persists chunks and populates PgVector metadata with content", async () => {
		const result = await embedPage(pageId);
		expect(result.pageId).toBe(pageId);
		expect(result.chunksCreated).toBeGreaterThan(0);

		// 1. Drizzle side: rows exist, statuses all flipped to embedded.
		const dbRows = await db
			.select()
			.from(chunks)
			.where(eq(chunks.scrapedPageId, pageId));
		expect(dbRows).toHaveLength(result.chunksCreated);
		expect(dbRows.every((r) => r.status === "embedded")).toBe(true);
		expect(dbRows.every((r) => r.errorMessage === null)).toBe(true);

		// 2. PgVector side: every row in the index has metadata that parses
		//    through the shared Zod schema, and every field matches the
		//    corresponding Drizzle row by `chunkId`.
		const hits = await pgVectorChunks.query({
			indexName: CHUNKS_INDEX_NAME,
			queryVector: new Array(CHUNKS_DIMENSION).fill(0),
			topK: 100,
			filter: { scrapedPageId: pageId },
		});
		expect(hits).toHaveLength(dbRows.length);

		for (const hit of hits) {
			const parsed = chunkVectorMetadataSchema.parse(hit.metadata);
			const dbRow = dbRows.find((r) => r.id === parsed.chunkId);
			expect(dbRow, `no DB row for chunkId ${parsed.chunkId}`).toBeDefined();
			expect(parsed.scrapedPageId).toBe(pageId);
			expect(parsed.scrapedWebsiteId).toBe(websiteId);
			expect(parsed.chunkIndex).toBe(dbRow?.chunkIndex);
			expect(parsed.content).toBe(dbRow?.content);
			expect(parsed.tokenCount).toBe(dbRow?.tokenCount);
			// `hit.id` is what `ids:` got upserted with — must match the
			// Drizzle UUID so future retrievers can JOIN back safely.
			expect(hit.id).toBe(parsed.chunkId);
		}
	});

	test("is idempotent — re-running replaces rather than duplicates", async () => {
		const before = await db
			.select({ id: chunks.id })
			.from(chunks)
			.where(eq(chunks.scrapedPageId, pageId));
		expect(before.length).toBeGreaterThan(0);

		const result = await embedPage(pageId);

		const after = await db
			.select({ id: chunks.id })
			.from(chunks)
			.where(eq(chunks.scrapedPageId, pageId));

		// Same count (chunker is deterministic on the same markdown) but
		// every UUID is new because `embedPage` wipes + re-inserts in a
		// transaction.
		expect(after).toHaveLength(result.chunksCreated);
		expect(after).toHaveLength(before.length);
		const overlap = before.filter((b) => after.some((a) => a.id === b.id));
		expect(overlap).toHaveLength(0);

		// And PgVector is also fully rebuilt to the new IDs.
		const hits = await pgVectorChunks.query({
			indexName: CHUNKS_INDEX_NAME,
			queryVector: new Array(CHUNKS_DIMENSION).fill(0),
			topK: 100,
			filter: { scrapedPageId: pageId },
		});
		const vectorIds = new Set(hits.map((h) => h.id));
		const afterIds = new Set(after.map((a) => a.id));
		expect(vectorIds).toEqual(afterIds);
	});
});
