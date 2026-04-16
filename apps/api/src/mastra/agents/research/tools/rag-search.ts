import { google } from "@ai-sdk/google";
import { logger } from "@atlas/logger";
import { chunkVectorMetadataSchema } from "@atlas/schemas/api";
import { createTool } from "@mastra/core/tools";
import { embedMany } from "ai";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/index.ts";
import { scrapedPages } from "../../../../db/schema.ts";
import {
	CHUNKS_INDEX_NAME,
	pgVectorChunks,
} from "../../../rag/page-chunks-store.ts";
import { selectWithMmr } from "./mmr.ts";

/**
 * Functional medicine corpus semantic-search tool backing `ragResearcher`.
 *
 * Intentionally kept simple so we can see how raw retrieval is performing
 * before layering on quality tricks. The pipeline is:
 *
 *   1. Batch-embed every query in one `embedMany` round-trip using the
 *      same `gemini-embedding-001` model the corpus was indexed with.
 *      Vector-space must match at query time or similarity is meaningless.
 *   2. Parallel `pgVectorChunks.query()` per embedding with NO minScore
 *      filter by default (Mastra's default is `-1`). Cosine similarity
 *      scores live in [-1, 1]; we have no business setting a threshold
 *      until we've observed what real scores look like for our corpus.
 *   3. Read `content` straight off the vector-index metadata (embed-page.ts
 *      stores it there, validated against `chunkVectorMetadataSchema`).
 *      No chunks-table join needed.
 *   4. Deduplicate across queries by chunk id (keep highest score).
 *   5. Sort by score descending and take `finalTopK`.
 *   6. Batch-fetch `scraped_pages` for citation title + url.
 *
 * MMR diversity and `minScore` filtering are both OPT-IN via the tool
 * input — off by default so the tool does exactly what a reasonable RAG
 * baseline does, no more. The agent can turn them on when the brief
 * calls for it (e.g. when many focus items overlap topically).
 *
 * Failure modes (empty queries, DB errors, embedding errors) return an
 * empty `results` array rather than throwing, so the calling agent can
 * gracefully fall back to LLM-only reasoning. Matches the PubMed tool's
 * "return-empty-on-failure" contract.
 *
 * Per-call telemetry logs through `component=rag.tool` — mirrors the
 * `component=pubmed.tool` shape in `pubmed-search.ts`. Score
 * distributions are logged unconditionally (including on zero-result
 * calls) so we can diagnose empty-results issues from prod logs alone.
 */

const EMBEDDING_MODEL_ID = "gemini-embedding-001";
const DEFAULT_MMR_LAMBDA = 0.7;

const toolLog = logger.child({ component: "rag.tool" });

const inputSchema = z.object({
	queries: z
		.array(z.string().min(1))
		.min(1)
		.max(12)
		.describe(
			"1-12 natural-language queries. Prefer HyDE-style hypothetical answer passages (1-2 sentences describing the answer in the corpus's vocabulary) over bare keywords — the corpus is article prose, not a keyword index. Multi-query fan-out across angles (mechanism / treatment / biomarker) is encouraged.",
		),
	topKPerQuery: z
		.number()
		.int()
		.min(1)
		.max(30)
		.default(10)
		.describe(
			"How many raw hits to pull from pgvector per query before dedup.",
		),
	finalTopK: z
		.number()
		.int()
		.min(1)
		.max(30)
		.default(10)
		.describe(
			"Maximum number of chunks to return to the agent after dedup and (optional) MMR selection.",
		),
	minScore: z
		.number()
		.min(-1)
		.max(1)
		.optional()
		.default(0.55)
		.describe(
			"Optional cosine-similarity floor in [-1, 1]. Off by default. Set only when you have evidence that a threshold is helpful — observe real score distributions via scripts/diagnose-rag.ts first.",
		),
	useMmr: z
		.boolean()
		.default(true)
		.describe(
			"Opt in to MMR diversity selection (λ=0.7) over the deduped pool. Off by default — raw score ranking is the correct baseline when focus items don't overlap topically.",
		),
});

const resultSchema = z.object({
	chunkId: z.string(),
	content: z.string(),
	pageTitle: z.string(),
	pageUrl: z.string(),
	score: z.number(),
	matchedQuery: z.string(),
});

const outputSchema = z.object({
	results: z.array(resultSchema),
	totalChunksReturned: z.number(),
	uniquePagesReturned: z.number(),
	topScore: z.number(),
});

type Candidate = {
	chunkId: string;
	scrapedPageId: string;
	content: string;
	score: number;
	vector: number[];
	matchedQuery: string;
};

export const ragSearchTool = createTool({
	id: "ragSearch",
	description:
		"Semantic search over the functional medicine corpus (embedded Rupa Health " +
		"articles on root-cause protocols, biomarker interpretation, lifestyle " +
		"interventions, and supplementation). Pass 1-12 natural-language queries " +
		"— HyDE-style hypothetical answer passages work best. Returns ranked " +
		"chunks with page title, url, and content. Cite chunks by chunkId — " +
		"only cite chunks this tool actually returns.",
	inputSchema,
	outputSchema,
	execute: async (input) => {
		const queries = input.queries;
		const topKPerQuery = input.topKPerQuery ?? 10;
		const finalTopK = input.finalTopK ?? 10;
		const minScore = input.minScore;
		const useMmr = input.useMmr ?? false;
		const startedAt = Date.now();

		if (queries.length === 0) {
			return {
				results: [],
				totalChunksReturned: 0,
				uniquePagesReturned: 0,
				topScore: 0,
			};
		}

		try {
			// 1. Batch-embed all queries in one round-trip.
			const embedStart = Date.now();
			const { embeddings } = await embedMany({
				model: google.embeddingModel(EMBEDDING_MODEL_ID),
				values: queries,
			});
			const embeddingMs = Date.now() - embedStart;

			// 2. Parallel vector queries. Only pass `minScore` when the caller
			//    explicitly set it (Mastra's default of -1 = no filter). Only
			//    request the full vector when MMR is on — saves bandwidth on
			//    3072-dim embeddings.
			const vectorStart = Date.now();
			const perQueryResults = await Promise.all(
				embeddings.map((queryVector) =>
					pgVectorChunks.query({
						indexName: CHUNKS_INDEX_NAME,
						queryVector,
						topK: topKPerQuery,
						...(minScore !== undefined ? { minScore } : {}),
						includeVector: useMmr,
					}),
				),
			);
			const vectorQueryMs = Date.now() - vectorStart;

			// Per-query score stats for telemetry — computed even when results
			// are empty so diagnostics can surface "query had 0 hits at minScore=X".
			const perQueryStats = perQueryResults.map((hits, i) => {
				const scores = hits.map((h) => h.score);
				const query = queries[i] ?? "";
				return {
					query: query.slice(0, 120),
					hits: hits.length,
					topScore: scores.length > 0 ? Math.max(...scores) : 0,
					meanScore:
						scores.length > 0
							? scores.reduce((a, b) => a + b, 0) / scores.length
							: 0,
					minScoreSeen: scores.length > 0 ? Math.min(...scores) : 0,
				};
			});

			// 3. Dedup across queries by chunk id; keep highest score. Parse
			//    metadata through the shared schema so a drift in the upsert
			//    contract surfaces here as a visible skip rather than a silent
			//    empty-content result. (Skipped chunks are logged below.)
			let metadataParseFailures = 0;
			const bestByChunkId = new Map<string, Candidate>();
			for (let i = 0; i < perQueryResults.length; i++) {
				const hits = perQueryResults[i] ?? [];
				const query = queries[i] ?? "";
				for (const hit of hits) {
					const parsed = chunkVectorMetadataSchema.safeParse(hit.metadata);
					if (!parsed.success) {
						metadataParseFailures++;
						continue;
					}
					const { chunkId, scrapedPageId, content } = parsed.data;
					const existing = bestByChunkId.get(chunkId);
					if (!existing || hit.score > existing.score) {
						bestByChunkId.set(chunkId, {
							chunkId,
							scrapedPageId,
							content,
							score: hit.score,
							vector: hit.vector ?? [],
							matchedQuery: query,
						});
					}
				}
			}
			const deduped = Array.from(bestByChunkId.values());

			// 4. Pick the final set: MMR when requested, else top-N by score.
			const selected = useMmr
				? selectWithMmr(deduped, finalTopK, DEFAULT_MMR_LAMBDA)
				: deduped.sort((a, b) => b.score - a.score).slice(0, finalTopK);

			if (selected.length === 0) {
				toolLog.info(
					{
						queries: perQueryStats,
						minScore,
						useMmr,
						totalChunksReturned: 0,
						uniquePagesReturned: 0,
						metadataParseFailures,
						durationMs: Date.now() - startedAt,
						embeddingMs,
						vectorQueryMs,
						joinMs: 0,
					},
					"rag: no results",
				);
				return {
					results: [],
					totalChunksReturned: 0,
					uniquePagesReturned: 0,
					topScore: 0,
				};
			}

			// 5. Batch-fetch page title/url for citations. One row per unique
			//    page id, not per chunk.
			const joinStart = Date.now();
			const uniquePageIds = Array.from(
				new Set(selected.map((c) => c.scrapedPageId)),
			);
			const pageRows = await db
				.select({
					id: scrapedPages.id,
					title: scrapedPages.title,
					url: scrapedPages.url,
				})
				.from(scrapedPages)
				.where(inArray(scrapedPages.id, uniquePageIds));
			const joinMs = Date.now() - joinStart;
			const pageById = new Map(pageRows.map((p) => [p.id, p]));

			const results = selected.map((c) => {
				const page = pageById.get(c.scrapedPageId);
				return {
					chunkId: c.chunkId,
					content: c.content,
					pageTitle: page?.title ?? "(untitled)",
					pageUrl: page?.url ?? "",
					score: c.score,
					matchedQuery: c.matchedQuery,
				};
			});

			const uniquePagesReturned = new Set(results.map((r) => r.pageUrl)).size;
			const topScore = results[0]?.score ?? 0;

			toolLog.info(
				{
					queries: perQueryStats,
					minScore,
					useMmr,
					totalChunksReturned: results.length,
					uniquePagesReturned,
					topScore,
					metadataParseFailures,
					durationMs: Date.now() - startedAt,
					embeddingMs,
					vectorQueryMs,
					joinMs,
				},
				"rag: success",
			);

			return {
				results,
				totalChunksReturned: results.length,
				uniquePagesReturned,
				topScore,
			};
		} catch (err) {
			toolLog.warn(
				{
					queryCount: queries.length,
					minScore,
					useMmr,
					durationMs: Date.now() - startedAt,
					err,
				},
				"rag: failed — returning empty result",
			);
			return {
				results: [],
				totalChunksReturned: 0,
				uniquePagesReturned: 0,
				topScore: 0,
			};
		}
	},
});
