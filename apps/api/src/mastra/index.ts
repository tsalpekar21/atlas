import { logger as appLogger } from "@atlas/logger";
import { Mastra } from "@mastra/core/mastra";
import { SimpleAuth } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import {
	CloudExporter,
	DefaultExporter,
	Observability,
	SensitiveDataFilter,
} from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { env } from "../env.ts";
import { healthAssistant } from "./agents/health-assistant/index.ts";
import { researchSynthesizer } from "./agents/research/synthesizer.ts";
import { guidelineResearcher } from "./agents/research/workers/guideline-researcher.ts";
import { literatureResearcher } from "./agents/research/workers/literature-researcher.ts";
import { ragResearcher } from "./agents/research/workers/rag-researcher.ts";
import {
	CHUNKS_DIMENSION,
	CHUNKS_INDEX_NAME,
	CHUNKS_VECTOR_TYPE,
	pgVectorChunks,
} from "./rag/page-chunks-store.ts";
import { backgroundResearchWorkflow } from "./workflows/background-research.ts";

export const mastra = new Mastra({
	agents: {
		healthAssistant,
		researchSynthesizer,
		guidelineResearcher,
		literatureResearcher,
		ragResearcher,
	},
	workflows: {
		backgroundResearch: backgroundResearchWorkflow,
	},
	server: {
		auth: new SimpleAuth({
			tokens: {
				[env.MASTRA_API_KEY]: {
					id: "mastra-studio",
					name: "Mastra Studio",
					role: "admin",
				},
			},
		}),
	},
	storage: new PostgresStore({
		id: "mastra-storage",
		connectionString: env.DATABASE_URL,
		schemaName: "mastra",
	}),
	vectors: {
		pgChunks: pgVectorChunks,
	},
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	observability: new Observability({
		configs: {
			default: {
				serviceName: "mastra",
				exporters: [new DefaultExporter(), new CloudExporter()],
				spanOutputProcessors: [new SensitiveDataFilter()],
			},
		},
	}),
});

// Ensure the page_chunks pgvector index exists on boot. Idempotent: PgVector's
// createIndex no-ops if the index is already present, and also installs the
// `vector` extension on first run. We intentionally swallow-and-log errors so
// the API server still boots if the vector store is transiently unavailable.

void pgVectorChunks
	.createIndex({
		indexName: CHUNKS_INDEX_NAME,
		dimension: CHUNKS_DIMENSION,
		vectorType: CHUNKS_VECTOR_TYPE,
	})
	.catch((error) => {
		appLogger.error(
			{ err: error },
			"Failed to ensure page_chunks vector index",
		);
	});
