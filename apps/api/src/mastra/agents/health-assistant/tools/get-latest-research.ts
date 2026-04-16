import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
	awaitInflightResearch,
	type PlannerBrief,
	type ResearchSynthesis,
} from "../../../../services/research.ts";

const evidenceItemSchema = z.object({
	claim: z.string(),
	source: z.string().optional(),
	sourceQuality: z.string().optional(),
	relationship: z.string().optional(),
	hypothesis: z.string().optional(),
	confidence: z.number().optional(),
	facts: z.array(z.string()).default([]),
});

const updatedRankingSchema = z.object({
	label: z.string(),
	previousConfidence: z.number().optional(),
	newConfidence: z.number().optional(),
	reason: z.string().optional(),
});

const scopeSchema = z.object({
	mode: z.enum(["triage", "treatment", "goals"]),
	focusItems: z.array(z.string()),
});

const outputSchema = z.object({
	available: z.boolean(),
	roundId: z.string().optional(),
	completedAt: z.string().optional(),
	whatChanged: z.string().optional(),
	scope: scopeSchema.optional(),
	updatedRankings: z.array(updatedRankingSchema).default([]),
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
				updatedRankings: [],
				suggestedQuestions: [],
				evidenceItems: [],
				escalationFlags: [],
			};
		}
		const row = await awaitInflightResearch(threadId);
		if (!row) {
			return {
				available: false,
				updatedRankings: [],
				suggestedQuestions: [],
				evidenceItems: [],
				escalationFlags: [],
			};
		}
		const synthesis = (row.synthesis ?? null) as ResearchSynthesis | null;
		const brief = (row.brief ?? null) as PlannerBrief | null;
		return {
			available: true,
			roundId: row.id,
			completedAt: row.createdAt.toISOString(),
			whatChanged: row.whatChanged ?? undefined,
			scope: brief
				? {
						mode: brief.mode,
						focusItems: brief.focusItems.map((f) => f.label),
					}
				: undefined,
			updatedRankings: Array.isArray(synthesis?.updatedRankings)
				? (synthesis.updatedRankings as z.infer<typeof updatedRankingSchema>[])
				: [],
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
