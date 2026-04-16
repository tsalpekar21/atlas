import { google } from "@ai-sdk/google";
import { logger } from "@atlas/logger";
import {
	type ChunkVectorMetadata,
	chunkVectorMetadataSchema,
} from "@atlas/schemas/api";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { chunks, scrapedPages } from "../../db/schema.ts";
import {
	CHUNKS_INDEX_NAME,
	pgVectorChunks,
} from "../../mastra/rag/page-chunks-store.ts";
import { enqueueMany } from "../../tasks/enqueue.ts";

const EMBEDDING_MODEL_ID = "gemini-embedding-001";
const CHUNK_MAX_SIZE = 512;
const CHUNK_OVERLAP = 50;
// Google's embedContents endpoint caps a single request at 100 values. A
// page with >100 chunks must be split into sub-batches, otherwise the call
// errors out with "Requests per call must be less than or equal to 100".
const EMBED_BATCH_SIZE = 100;

function estimateTokenCount(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4));
}

export interface EmbedPageResult {
	pageId: string;
	chunksCreated: number;
	durationMs: number;
}

/**
 * Split a scraped page's markdown into chunks, embed them with Google
 * text-embedding-004, persist rows to `chunks`, and upsert vectors into the
 * Mastra-managed `page_chunks` PgVector index. Idempotent: existing chunks for
 * the page are deleted before inserting new ones, so re-runs wipe-and-rebuild.
 */
export async function embedPage(pageId: string): Promise<EmbedPageResult> {
	const start = Date.now();

	const [page] = await db
		.select({
			id: scrapedPages.id,
			markdown: scrapedPages.markdown,
			scrapedWebsiteId: scrapedPages.scrapedWebsiteId,
		})
		.from(scrapedPages)
		.where(eq(scrapedPages.id, pageId))
		.limit(1);

	if (!page) {
		throw new Error(`embedPage: page ${pageId} not found`);
	}

	if (!page.markdown || page.markdown.trim().length === 0) {
		logger.info({ pageId }, "embedPage: skipping page with empty markdown");
		await db.delete(chunks).where(eq(chunks.scrapedPageId, pageId));
		return { pageId, chunksCreated: 0, durationMs: Date.now() - start };
	}

	const doc = MDocument.fromMarkdown(page.markdown);
	const splitChunks = await doc.chunk({
		strategy: "semantic-markdown",
		maxSize: CHUNK_MAX_SIZE,
		overlap: CHUNK_OVERLAP,
	});

	if (splitChunks.length === 0) {
		logger.warn({ pageId }, "embedPage: chunker produced zero chunks");
		await db.delete(chunks).where(eq(chunks.scrapedPageId, pageId));
		return { pageId, chunksCreated: 0, durationMs: Date.now() - start };
	}

	const pending = splitChunks.map((chunk, index) => ({
		index,
		content: chunk.text,
		tokenCount: estimateTokenCount(chunk.text),
	}));

	// Wipe + insert in a transaction so the chunks table never shows a
	// half-rebuilt state to readers. PgVector upsert happens after the tx
	// commits; on failure we flip status→failed so the UI surfaces it.
	const inserted = await db.transaction(async (tx) => {
		await tx.delete(chunks).where(eq(chunks.scrapedPageId, pageId));
		return tx
			.insert(chunks)
			.values(
				pending.map((p) => ({
					scrapedPageId: pageId,
					scrapedWebsiteId: page.scrapedWebsiteId,
					chunkIndex: p.index,
					content: p.content,
					tokenCount: p.tokenCount,
					status: "pending" as const,
				})),
			)
			.returning({ id: chunks.id, chunkIndex: chunks.chunkIndex });
	});

	const idByIndex = new Map(inserted.map((row) => [row.chunkIndex, row.id]));
	const chunkIds = pending.map((p) => {
		const id = idByIndex.get(p.index);
		if (!id) throw new Error(`embedPage: missing id for chunk ${p.index}`);
		return id;
	});

	try {
		const values = pending.map((p) => p.content);
		const embeddings: number[][] = [];
		for (let offset = 0; offset < values.length; offset += EMBED_BATCH_SIZE) {
			const batch = values.slice(offset, offset + EMBED_BATCH_SIZE);
			const result = await embedMany({
				model: google.embeddingModel(EMBEDDING_MODEL_ID),
				values: batch,
			});
			embeddings.push(...result.embeddings);
		}

		// Validate each metadata blob through Zod at the upsert boundary so the
		// JSONB stored in `page_chunks` always matches the declared contract in
		// `@atlas/schemas`. RAG consumers that re-parse on read can trust this.
		const metadata: ChunkVectorMetadata[] = pending.map((p) => {
			const chunkId = idByIndex.get(p.index);
			if (!chunkId) {
				throw new Error(`embedPage: missing id for chunk ${p.index}`);
			}
			return chunkVectorMetadataSchema.parse({
				chunkId,
				scrapedPageId: pageId,
				scrapedWebsiteId: page.scrapedWebsiteId,
				chunkIndex: p.index,
				content: p.content,
				tokenCount: p.tokenCount,
			});
		});

		// `deleteFilter` atomically purges any prior vectors for this page
		// before inserting the new ones, inside a single transaction. Without
		// it, re-embedding leaves orphaned vectors in the index whose UUIDs
		// no longer exist in the Drizzle `chunks` table — RAG hits against
		// those rows would dangle. Mirrors the `tx.delete(chunks)` wipe we do
		// on the relational side above.
		await pgVectorChunks.upsert({
			indexName: CHUNKS_INDEX_NAME,
			vectors: embeddings,
			ids: chunkIds,
			metadata,
			deleteFilter: { scrapedPageId: pageId },
		});

		await db
			.update(chunks)
			.set({ status: "embedded", errorMessage: null })
			.where(eq(chunks.scrapedPageId, pageId));

		const durationMs = Date.now() - start;
		logger.info(
			{ pageId, chunksCreated: pending.length, durationMs },
			"embedPage: success",
		);
		return { pageId, chunksCreated: pending.length, durationMs };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error({ pageId, err: error }, "embedPage: failed");
		await db
			.update(chunks)
			.set({ status: "failed", errorMessage: message })
			.where(eq(chunks.scrapedPageId, pageId));
		throw error;
	}
}

/**
 * Flip all existing chunks for a page to `pending` so the admin UI's
 * status poll starts immediately, before the Cloud Tasks worker picks up
 * the job. Without this the UI refetch races the worker and sees stale
 * `embedded` rows, stopping its poll before progress is visible.
 */
export async function markPageChunksPending(pageId: string): Promise<void> {
	await db
		.update(chunks)
		.set({ status: "pending", errorMessage: null })
		.where(eq(chunks.scrapedPageId, pageId));
}

export async function markWebsiteChunksPending(
	websiteId: string,
): Promise<void> {
	await db
		.update(chunks)
		.set({ status: "pending", errorMessage: null })
		.where(eq(chunks.scrapedWebsiteId, websiteId));
}

/**
 * Fan every page of a website out onto the `embed-page` Cloud Tasks queue.
 * Returns once the tasks are enqueued, not once they run — the queue
 * handles retries and parallelism. Failures inside individual tasks are
 * surfaced via `chunks.status` as before.
 */
export async function enqueueWebsiteReembed(
	websiteId: string,
): Promise<{ websiteId: string; pagesEnqueued: number }> {
	const pageRows = await db
		.select({ id: scrapedPages.id })
		.from(scrapedPages)
		.where(eq(scrapedPages.scrapedWebsiteId, websiteId))
		.orderBy(asc(scrapedPages.createdAt));

	await markWebsiteChunksPending(websiteId);

	await enqueueMany(
		"embedPage",
		pageRows.map((row) => ({ pageId: row.id })),
	);

	logger.info(
		{ websiteId, pagesEnqueued: pageRows.length },
		"enqueueWebsiteReembed: complete",
	);
	return { websiteId, pagesEnqueued: pageRows.length };
}
