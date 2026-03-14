import { createTool } from "@mastra/core/tools";
import {
  presentQuestionInputSchema,
  presentQuestionOutputSchema,
  triageSummaryInputSchema,
} from "@atlas/schemas/triage";

/**
 * Client-side tool: the agent calls this to present the user with
 * selectable options. The structured input is streamed to the frontend
 * as a tool invocation part and rendered as clickable buttons.
 * The user's selection is returned as the tool result via addToolOutput.
 */
export const presentQuestionTool = createTool({
  id: "present_question",
  description:
    "Present a question to the patient with selectable options. Use this when you want to give the patient predefined choices to select from. For single-select, the patient picks one option. For multi-select, the patient can pick several.",
  inputSchema: presentQuestionInputSchema,
  outputSchema: presentQuestionOutputSchema,
});

/**
 * Client-side display-only tool: the agent calls this when it has gathered
 * enough information to produce a clinical triage summary. The structured
 * input contains all the fields needed to render the summary card.
 * No tool result is provided -- the conversation ends after the summary.
 */
export const generateTriageSummaryTool = createTool({
  id: "generate_triage_summary",
  description:
    "Generate a structured triage summary after gathering sufficient patient information. Call this tool ONLY when you have collected: the chief complaint, body location, duration, severity, symptoms, treatments tried, potential triggers, and have sufficient confidence to recommend a care pathway. The structured input you provide will be displayed as a formatted summary card to the patient.",
  inputSchema: triageSummaryInputSchema,
});
