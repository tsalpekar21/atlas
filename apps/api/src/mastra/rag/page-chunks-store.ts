import { PgVector } from "@mastra/pg";
import { env } from "../../env.ts";

export const CHUNKS_INDEX_NAME = "page_chunks";
// `gemini-embedding-001` outputs 3072-dimensional vectors by default. pgvector
// indexes on the standard `vector` type cap at 2000 dims, so the index must
// use `halfvec` (2 bytes/dim, supports up to 4000). See
// https://github.com/pgvector/pgvector#vector-type.
export const CHUNKS_DIMENSION = 3072;
export const CHUNKS_VECTOR_TYPE = "halfvec" as const;

export const pgVectorChunks = new PgVector({
	id: "page-chunks",
	connectionString: env.DATABASE_URL,
});
