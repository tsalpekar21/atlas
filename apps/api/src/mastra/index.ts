import { Mastra } from "@mastra/core/mastra";
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
import { backgroundResearchWorkflow } from "./workflows/background-research.ts";

export const mastra = new Mastra({
	agents: {
		healthAssistant,
		researchSynthesizer,
		guidelineResearcher,
		literatureResearcher,
	},
	workflows: {
		backgroundResearch: backgroundResearchWorkflow,
	},
	storage: new PostgresStore({
		id: "mastra-storage",
		connectionString: env.DATABASE_URL,
		schemaName: "mastra",
	}),
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
