import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { HEALTH_ASSISTANT_SYSTEM_PROMPT } from "../../mastra/agents/health-assistant/prompt.js";
import { USER_PROFILE_TEMPLATE } from "../../mastra/agents/health-assistant/template.js";
import { controlResearchTool } from "./control-research-tool.js";

export const HEALTH_ASSISTANT_CONTROL_AGENT_ID = "healthAssistantControl";

export const healthAssistantControl = new Agent({
	id: HEALTH_ASSISTANT_CONTROL_AGENT_ID,
	name: "Atlas Health Assistant (Control — no research)",
	instructions: HEALTH_ASSISTANT_SYSTEM_PROMPT,
	model: "google/gemini-3-flash-preview",
	tools: { getLatestResearch: controlResearchTool },
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
			generateTitle: false,
		},
	}),
});
