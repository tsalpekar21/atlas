import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { summarySchema } from "../types.ts";

export const GENERATE_SUMMARY_TOOL_NAME = "generateSummary";

export const generateSummaryTool = createTool({
	id: GENERATE_SUMMARY_TOOL_NAME,
	description:
		"Call this tool exactly once when you have completed your triage and are ready to submit a final, defensible summary of the case. After calling, the conversation ends and your summary is handed off for review. Include your diagnostic hypotheses with calibrated confidences, red flags you've identified, recommended next steps, evidence references supporting your reasoning, and any open questions that still require the patient's input.",
	inputSchema: summarySchema,
	outputSchema: z.object({
		acknowledged: z.literal(true),
	}),
	execute: async () => ({ acknowledged: true as const }),
});
