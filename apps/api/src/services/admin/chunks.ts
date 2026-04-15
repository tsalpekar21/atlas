import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { chunks } from "../../db/schema.ts";

export async function listPageChunks(pageId: string) {
	const rows = await db
		.select({
			id: chunks.id,
			chunkIndex: chunks.chunkIndex,
			content: chunks.content,
			tokenCount: chunks.tokenCount,
			status: chunks.status,
		})
		.from(chunks)
		.where(eq(chunks.scrapedPageId, pageId))
		.orderBy(asc(chunks.chunkIndex));

	return rows;
}
