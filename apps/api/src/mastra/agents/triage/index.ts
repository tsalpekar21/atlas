import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { researchOrchestrator } from "../research/orchestrator.js";
import { TRIAGE_SYSTEM_PROMPT } from "./prompt.js";
import { PATIENT_CHART_TEMPLATE } from "./template.js";

export const triageAgent = new Agent({
	id: "triageAgent",
	name: "Atlas Clinical Reasoning Companion",
	instructions: TRIAGE_SYSTEM_PROMPT,
	model: "google/gemini-3-flash-preview",
	agents: { researchOrchestrator },
	defaultOptions: {
		maxSteps: 15,
		providerOptions: {
			google: {
				thinkingConfig: { thinkingLevel: "high" },
			},
		},
		delegation: {
			onDelegationStart: async (context) => {
				if (context.iteration > 12) {
					return {
						proceed: false,
						rejectionReason:
							"Research budget exhausted. Synthesize with current evidence.",
					};
				}
				return { proceed: true };
			},
			onDelegationComplete: async (context) => {
				if (context.error) {
					return {
						feedback:
							"Research subsystem encountered an error. Continue the interview with your current hypotheses and evidence.",
					};
				}
			},
		},
	},
	memory: new Memory({
		options: {
			workingMemory: {
				enabled: true,
				template: PATIENT_CHART_TEMPLATE,
			},
			generateTitle: true,
		},
	}),
});
