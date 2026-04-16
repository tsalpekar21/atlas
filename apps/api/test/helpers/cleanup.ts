import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.ts";
import {
	researchFindings,
	scrapedPages,
	scrapedWebsites,
} from "../../src/db/schema.ts";
import {
	CHUNKS_INDEX_NAME,
	pgVectorChunks,
} from "../../src/mastra/rag/page-chunks-store.ts";

/**
 * Teardown helpers for integration tests that create research_findings
 * rows, scraped pages, or embedded chunks. Every helper is best-effort:
 * failures are swallowed so `afterAll` cleanup never masks the real
 * test failure.
 */

/**
 * Delete every `research_findings` row for a thread. Runs after each
 * test that exercises the workflow so repeat runs start from a clean
 * slate.
 */
export async function cleanupThread(threadId: string): Promise<void> {
	try {
		await db
			.delete(researchFindings)
			.where(eq(researchFindings.threadId, threadId));
	} catch {
		// best-effort — the next test's fresh threadId isolates it anyway
	}
}

/**
 * Delete a scraped website and cascade through `scraped_pages` and
 * `chunks` via the FK `ON DELETE CASCADE`. Also deletes every pgvector
 * entry whose metadata points at any of the pages we just nuked, so a
 * subsequent `seedRagCorpus()` in the same test run starts clean.
 */
export async function cleanupWebsite(
	websiteId: string,
	pageIds: string[] = [],
): Promise<void> {
	// Nuke pgvector entries first — Drizzle's ON DELETE CASCADE kills
	// the chunks table but the PgVector index is external and needs its
	// own filtered delete call.
	for (const pageId of pageIds) {
		try {
			await pgVectorChunks.deleteVectors({
				indexName: CHUNKS_INDEX_NAME,
				filter: { scrapedPageId: pageId },
			});
		} catch {
			// best-effort
		}
	}
	try {
		await db.delete(scrapedWebsites).where(eq(scrapedWebsites.id, websiteId));
	} catch {
		// best-effort
	}
	// Belt + suspenders: if any pages survived the cascade (shouldn't,
	// but tests have seen this before when the FK constraint wasn't
	// deferrable), delete them explicitly too.
	for (const pageId of pageIds) {
		try {
			await db.delete(scrapedPages).where(eq(scrapedPages.id, pageId));
		} catch {
			// best-effort
		}
	}
}
