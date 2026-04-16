import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const controlResearchTool = createTool({
	id: "getLatestResearch",
	description:
		"Returns the most recent completed background research round for the " +
		"current thread. Call this at the start of every turn before deciding " +
		"your next question. Returns { available: false } if no research has " +
		"completed yet for this conversation.",
	inputSchema: z.object({}),
	outputSchema: z.object({
		available: z.boolean(),
		suggestedQuestions: z.array(z.string()).default([]),
		evidenceItems: z.array(z.unknown()).default([]),
		escalationFlags: z.array(z.unknown()).default([]),
	}),
	execute: async () => ({
		available: false,
		suggestedQuestions: [],
		evidenceItems: [],
		escalationFlags: [],
	}),
});
