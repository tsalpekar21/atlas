import { google } from "@ai-sdk/google";
import { chunkVectorMetadataSchema } from "@atlas/schemas/api";
import { embedMany } from "ai";
import { inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import { scrapedPages } from "../db/schema.ts";
import {
	CHUNKS_INDEX_NAME,
	pgVectorChunks,
} from "../mastra/rag/page-chunks-store.ts";

/**
 * Diagnostic script for the functional medicine RAG pipeline. Hits the
 * real embedded corpus with one or more queries and prints the raw
 * pgvector score distribution — NO minScore filter, NO MMR, just the
 * top-30 chunks by cosine similarity.
 *
 * Use this to answer questions like:
 *   - Is the corpus actually embedded?
 *   - What does a "good" vs "bad" score look like for our data?
 *   - Does HyDE phrasing beat keyword phrasing?
 *   - Are chunks from the right page surfacing for a known-good query?
 *
 * Usage:
 *   pnpm --filter api diagnose:rag "query 1" "query 2"
 *
 * With no args, runs a built-in set of 5 test queries covering
 * keyword vs HyDE shapes across common functional-medicine topics.
 */

const EMBEDDING_MODEL_ID = "gemini-embedding-001";
const DEFAULT_TOP_K = 30;

const DEFAULT_QUERIES = [
	// Keyword (likely poor)
	"SIBO",
	// HyDE (likely better)
	"Small intestinal bacterial overgrowth is driven by functional root causes including low stomach acid, migrating motor complex dysfunction, and ileocecal valve incompetence. Treatment protocols include herbal antimicrobials, prokinetics, and elemental diets.",
	// Medium — a natural clinical question
	"What are the root causes of postprandial bloating in functional medicine?",
	// Topic that should be well-covered
	"Low ferritin interpretation in functional medicine includes iron deficiency anemia, chronic inflammation, and GI blood loss.",
	// Topic that should NOT be well-covered (sanity check — should score low)
	"Acute appendicitis surgical management post-operative antibiotic protocols",
];

async function run(): Promise<void> {
	const argQueries = process.argv.slice(2);
	const queries = argQueries.length > 0 ? argQueries : DEFAULT_QUERIES;

	console.log(`\n=== RAG diagnostic: ${queries.length} query(ies) ===`);
	console.log(`Index: ${CHUNKS_INDEX_NAME}`);
	console.log(`topK per query: ${DEFAULT_TOP_K}`);
	console.log(`No minScore filter. No MMR. Raw similarity order.\n`);

	const embedStart = Date.now();
	const { embeddings } = await embedMany({
		model: google.embeddingModel(EMBEDDING_MODEL_ID),
		values: queries,
	});
	console.log(
		`Embedded ${queries.length} queries in ${Date.now() - embedStart}ms`,
	);

	for (let i = 0; i < queries.length; i++) {
		const query = queries[i];
		const vec = embeddings[i];
		if (!query || !vec) continue;

		const started = Date.now();
		const hits = await pgVectorChunks.query({
			indexName: CHUNKS_INDEX_NAME,
			queryVector: vec,
			topK: DEFAULT_TOP_K,
		});
		const durationMs = Date.now() - started;

		console.log(
			`\n--- Query ${i + 1} (${durationMs}ms, ${hits.length} hits) ---`,
		);
		console.log(`"${query}"`);

		if (hits.length === 0) {
			console.log("  [no hits — corpus is empty or vector-space mismatch]");
			continue;
		}

		const scores = hits.map((h) => h.score);
		const min = Math.min(...scores);
		const max = Math.max(...scores);
		const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
		console.log(
			`  Score distribution: top=${max.toFixed(4)} mean=${mean.toFixed(4)} bottom=${min.toFixed(4)}`,
		);

		// Thresholds commonly used in RAG tooling — report how many hits
		// each threshold would admit so we can pick one based on real data.
		for (const t of [0.3, 0.4, 0.5, 0.55, 0.6, 0.7]) {
			const n = hits.filter((h) => h.score > t).length;
			console.log(`    ${n.toString().padStart(3)} hits > ${t.toFixed(2)}`);
		}

		// Join page metadata so we can see which articles are actually
		// surfacing. Keeps the output human-readable.
		const pageIds = Array.from(
			new Set(
				hits
					.map((h) => {
						const parsed = chunkVectorMetadataSchema.safeParse(h.metadata);
						return parsed.success ? parsed.data.scrapedPageId : null;
					})
					.filter((id): id is string => id !== null),
			),
		);
		const pageRows = pageIds.length
			? await db
					.select({
						id: scrapedPages.id,
						title: scrapedPages.title,
						url: scrapedPages.url,
					})
					.from(scrapedPages)
					.where(inArray(scrapedPages.id, pageIds))
			: [];
		const pageById = new Map(pageRows.map((p) => [p.id, p]));

		console.log("  Top 10 hits:");
		for (let rank = 0; rank < Math.min(10, hits.length); rank++) {
			const hit = hits[rank];
			if (!hit) continue;
			const parsed = chunkVectorMetadataSchema.safeParse(hit.metadata);
			const content = parsed.success ? parsed.data.content : "";
			const pageId = parsed.success ? parsed.data.scrapedPageId : "";
			const page = pageById.get(pageId);
			const snippet = content.replace(/\s+/g, " ").slice(0, 90);
			console.log(
				`    ${(rank + 1).toString().padStart(2)}. ${hit.score.toFixed(4)} | ${page?.title ?? "(untitled)"}`,
			);
			console.log(`        ${snippet}${content.length > 90 ? "…" : ""}`);
		}
	}

	// Also report corpus size so we can rule out empty-index issues.
	const sizeResult = await pgVectorChunks.describeIndex({
		indexName: CHUNKS_INDEX_NAME,
	});
	console.log(
		`\n=== Corpus: ${sizeResult.count ?? "?"} vectors in ${CHUNKS_INDEX_NAME} ===\n`,
	);

	await pgVectorChunks.disconnect();
	process.exit(0);
}

run().catch((err) => {
	console.error("diagnose-rag failed:", err);
	process.exit(1);
});
