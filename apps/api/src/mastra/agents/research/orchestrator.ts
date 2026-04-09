import { Agent } from "@mastra/core/agent";

import { RESEARCH_ORCHESTRATOR_PROMPT } from "./prompt.js";
import { criticAgent } from "./workers/critic.js";
import { guidelineResearcher } from "./workers/guideline-researcher.js";
import { webResearcher } from "./workers/web-researcher.js";

export const researchOrchestrator = new Agent({
	id: "researchOrchestrator",
	name: "Research Orchestrator",
	description:
		"Decomposes clinical research questions into parallel sub-investigations, " +
		"delegates to specialized workers, and synthesizes evidence into structured " +
		"findings. Invoke when the triage agent needs deeper evidence to discriminate " +
		"hypotheses or resolve clinical unknowns.",
	instructions: RESEARCH_ORCHESTRATOR_PROMPT,
	model: "google/gemini-3-flash-preview",
	agents: { guidelineResearcher, webResearcher, criticAgent },
	defaultOptions: {
		maxSteps: 8,
		delegation: {
			onDelegationStart: async (context) => {
				if (context.iteration > 6) {
					return {
						proceed: false,
						rejectionReason:
							"Worker budget exhausted. Synthesize with available evidence.",
					};
				}
				return { proceed: true, modifiedMaxSteps: 3 };
			},
			onDelegationComplete: async (context) => {
				if (context.error) {
					return {
						feedback: `Worker ${context.primitiveId} failed: ${context.error}. Proceed with available evidence.`,
					};
				}
			},
		},
	},
});
