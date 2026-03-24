import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { logger } from "@atlas/logger";
import { PgVector } from "@mastra/pg";
import { MDocument } from "@mastra/rag";
import { embed, embedMany } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { doctorSiteCrawl } from "../db/schema.ts";

/** Mastra PgVector index name (see https://mastra.ai/docs/rag/overview). */
export const DOCTOR_SITE_CRAWL_RAG_INDEX = "doctor_site_crawl_rag";

/** Default output size for `gemini-embedding-001` (must match `createIndex` dimension). */
const EMBEDDING_DIMENSIONS = 768;

const EMBED_BATCH = 48;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
});

type PgVectorQueryFilter = NonNullable<
  Parameters<PgVector["query"]>[0]["filter"]
>;

let vectorStore: PgVector | null = null;

function getVectorStore(): PgVector {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for crawl RAG indexing");
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is required for crawl RAG indexing",
    );
  }
  if (!vectorStore) {
    vectorStore = new PgVector({
      id: "atlas-crawl-rag",
      connectionString: url,
      schemaName: "public",
    });
  }
  return vectorStore;
}

function jsonMetadata(m: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(m).filter(([, v]) => v !== undefined),
  );
}

async function ensureRagIndex(store: PgVector): Promise<void> {
  const names = await store.listIndexes();
  if (names.includes(DOCTOR_SITE_CRAWL_RAG_INDEX)) {
    return;
  }
  await store.createIndex({
    indexName: DOCTOR_SITE_CRAWL_RAG_INDEX,
    dimension: EMBEDDING_DIMENSIONS,
    metric: "cosine",
    indexConfig: { type: "hnsw" },
    metadataIndexes: ["crawlId", "npi"],
  });
}

export type CrawlRagIndexResult = {
  crawlId: string;
  chunksIndexed: number;
  pagesSkipped: number;
};

/**
 * Chunk crawl markdown with Mastra MDocument, embed with Google, store via Mastra PgVector.
 */
export async function indexDoctorSiteCrawlForRag(
  crawlId: string,
): Promise<CrawlRagIndexResult> {
  const [row] = await db
    .select()
    .from(doctorSiteCrawl)
    .where(eq(doctorSiteCrawl.id, crawlId))
    .limit(1);

  if (!row) {
    throw new Error(`Crawl not found: ${crawlId}`);
  }

  const pages = Array.isArray(row.pages) ? row.pages : [];
  const store = getVectorStore();
  await ensureRagIndex(store);

  await store.deleteVectors({
    indexName: DOCTOR_SITE_CRAWL_RAG_INDEX,
    filter: { crawlId },
  });

  type Row = {
    id: string;
    text: string;
    metadata: Record<string, unknown>;
  };
  const rows: Row[] = [];
  let pagesSkipped = 0;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const markdown =
      page && typeof page.markdown === "string" ? page.markdown.trim() : "";
    if (!markdown) {
      pagesSkipped++;
      continue;
    }

    const sourceUrl =
      typeof page.sourceURL === "string" && page.sourceURL.length > 0
        ? page.sourceURL
        : row.seedUrl;

    const meta =
      page.metadata &&
      typeof page.metadata === "object" &&
      page.metadata !== null
        ? (page.metadata as Record<string, unknown>)
        : {};

    const doc = MDocument.fromMarkdown(markdown, {
      sourceUrl,
      pageIndex,
    });
    const chunks = await doc.chunk({
      strategy: "markdown",
      maxSize: 512,
      overlap: 50,
    });

    chunks.forEach((chunk, chunkIndex) => {
      const text = chunk.getText();
      if (!text.trim()) return;
      const id = `${crawlId}:${pageIndex}:${chunkIndex}`;
      rows.push({
        id,
        text,
        metadata: jsonMetadata({
          text,
          sourceUrl,
          crawlId,
          npi: row.npi,
          pageIndex,
          chunkIndex,
          seedUrl: row.seedUrl,
          title:
            typeof meta.title === "string"
              ? meta.title
              : typeof meta.ogTitle === "string"
                ? meta.ogTitle
                : undefined,
          description:
            typeof meta.description === "string" ? meta.description : undefined,
        }),
      });
    });
  }

  if (rows.length === 0) {
    return { crawlId, chunksIndexed: 0, pagesSkipped };
  }

  for (let i = 0; i < rows.length; i += EMBED_BATCH) {
    const batch = rows.slice(i, i + EMBED_BATCH);
    const { embeddings } = await embedMany({
      model: google.embedding("gemini-embedding-001"),
      values: batch.map((r) => r.text),
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    });

    await store.upsert({
      indexName: DOCTOR_SITE_CRAWL_RAG_INDEX,
      vectors: embeddings,
      metadata: batch.map((r) => r.metadata),
      ids: batch.map((r) => r.id),
    });
  }

  logger.info(
    { crawlId, chunksIndexed: rows.length, pagesSkipped },
    "crawl_rag_indexed",
  );

  return {
    crawlId,
    chunksIndexed: rows.length,
    pagesSkipped,
  };
}

export type CrawlRagQueryHit = {
  id: string;
  score: number;
  text: string;
  sourceUrl: string;
  crawlId: string;
  npi: string;
  pageIndex?: number;
  chunkIndex?: number;
};

/**
 * Semantic search over indexed crawl chunks (same embeddings as indexing).
 */
export async function queryDoctorSiteCrawlRag(input: {
  query: string;
  topK: number;
  crawlId?: string;
  npi?: string;
}): Promise<{ query: string; tookMs: number; hits: CrawlRagQueryHit[] }> {
  const q = input.query.trim();
  if (!q) {
    return { query: input.query, tookMs: 0, hits: [] };
  }

  const store = getVectorStore();
  const names = await store.listIndexes();
  if (!names.includes(DOCTOR_SITE_CRAWL_RAG_INDEX)) {
    return { query: q, tookMs: 0, hits: [] };
  }

  let filter: PgVectorQueryFilter | undefined;
  if (input.crawlId && input.npi) {
    filter = {
      $and: [{ crawlId: input.crawlId }, { npi: input.npi }],
    } as PgVectorQueryFilter;
  } else if (input.crawlId) {
    filter = { crawlId: input.crawlId } as PgVectorQueryFilter;
  } else if (input.npi) {
    filter = { npi: input.npi } as PgVectorQueryFilter;
  }

  const started = Date.now();
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: q,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });

  const raw = await store.query({
    indexName: DOCTOR_SITE_CRAWL_RAG_INDEX,
    queryVector: embedding,
    topK: input.topK,
    filter,
  });

  const tookMs = Date.now() - started;

  const hits: CrawlRagQueryHit[] = raw.map((r) => {
    const meta = r.metadata ?? {};
    const text = typeof meta.text === "string" ? meta.text : "";
    const sourceUrl = typeof meta.sourceUrl === "string" ? meta.sourceUrl : "";
    const crawlId = typeof meta.crawlId === "string" ? meta.crawlId : "";
    const npi = typeof meta.npi === "string" ? meta.npi : "";
    const pageIndex =
      typeof meta.pageIndex === "number" ? meta.pageIndex : undefined;
    const chunkIndex =
      typeof meta.chunkIndex === "number" ? meta.chunkIndex : undefined;
    return {
      id: r.id,
      score: r.score,
      text,
      sourceUrl,
      crawlId,
      npi,
      pageIndex,
      chunkIndex,
    };
  });

  return { query: q, tookMs, hits };
}
