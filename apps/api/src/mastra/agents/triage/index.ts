import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { TRIAGE_SYSTEM_PROMPT } from "./prompt.js";
import { PATIENT_CHART_TEMPLATE } from "./template.js";

export const triageAgent = new Agent({
	id: "triageAgent",
	name: "Atlas Clinical Reasoning Companion",
	instructions: TRIAGE_SYSTEM_PROMPT,
	model: "google/gemini-3-flash-preview",
	defaultOptions: {
		providerOptions: {
			google: {
				thinkingConfig: { thinkingLevel: "high" },
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
