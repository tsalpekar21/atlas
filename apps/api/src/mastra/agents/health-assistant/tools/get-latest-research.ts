import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getLatestCompletedRound } from "../../../../services/research.ts";

const evidenceItemSchema = z.object({
	claim: z.string(),
	sourceQuality: z.string().optional(),
	relationship: z.string().optional(),
	hypothesis: z.string().optional(),
	confidence: z.number().optional(),
});

const outputSchema = z.object({
	available: z.boolean(),
	roundId: z.string().optional(),
	completedAt: z.string().optional(),
	whatChanged: z.string().optional(),
	suggestedQuestions: z.array(z.string()).default([]),
	evidenceItems: z.array(evidenceItemSchema).default([]),
	escalationFlags: z
		.array(
			z.object({
				description: z.string(),
				urgency: z.string().optional(),
				actionAdvised: z.string().optional(),
			}),
		)
		.default([]),
});

/**
 * Triage agent tool: returns the most recent completed background research
 * round for the current thread. The triage prompt tells the agent to call
 * this at the start of every turn so it can fold fresh findings into its
 * next question.
 *
 * The threadId is pulled from the agent execution context, so the model
 * does not need to (and cannot) pass one in.
 */
export const getLatestResearchTool = createTool({
	id: "getLatestResearch",
	description:
		"Returns the most recent completed background research round for the " +
		"current thread. Call this at the start of every turn before deciding " +
		"your next question. Returns { available: false } if no research has " +
		"completed yet for this conversation.",
	inputSchema: z.object({}),
	outputSchema,
	execute: async (_input, context) => {
		const threadId = context.agent?.threadId;
		if (!threadId) {
			return {
				available: false,
				suggestedQuestions: [],
				evidenceItems: [],
				escalationFlags: [],
			};
		}
		const row = await getLatestCompletedRound(threadId);
		if (!row) {
			return {
				available: false,
				suggestedQuestions: [],
				evidenceItems: [],
				escalationFlags: [],
			};
		}
		return {
			available: true,
			roundId: row.id,
			completedAt: row.createdAt.toISOString(),
			whatChanged: row.whatChanged ?? undefined,
			suggestedQuestions: Array.isArray(row.suggestedQuestions)
				? (row.suggestedQuestions as string[])
				: [],
			evidenceItems: Array.isArray(row.evidenceItems)
				? (row.evidenceItems as z.infer<typeof evidenceItemSchema>[])
				: [],
			escalationFlags: Array.isArray(row.escalationFlags)
				? (row.escalationFlags as {
						description: string;
						urgency?: string;
						actionAdvised?: string;
					}[])
				: [],
		};
	},
});
