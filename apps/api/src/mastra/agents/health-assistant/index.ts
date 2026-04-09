import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { HEALTH_ASSISTANT_SYSTEM_PROMPT } from "./prompt.js";
import { USER_PROFILE_TEMPLATE } from "./template.js";
import { getLatestResearchTool } from "./tools/get-latest-research.js";

export const healthAssistant = new Agent({
	id: "healthAssistant",
	name: "Atlas Health Assistant",
	instructions: HEALTH_ASSISTANT_SYSTEM_PROMPT,
	model: "google/gemini-3-flash-preview",
	tools: { getLatestResearch: getLatestResearchTool },
	defaultOptions: {
		maxSteps: 15,
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
				template: USER_PROFILE_TEMPLATE,
			},
			generateTitle: true,
		},
	}),
});
