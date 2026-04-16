import { createScorer } from "@mastra/core/evals";
import { z } from "zod";
import {
	abCompareOutputSchema,
	caseInputSchema,
	formatArmForJudge,
} from "../../types.ts";
import { JUDGE_MODEL, positionAssignment, winnerToScore } from "../judge.ts";

const analyzeSchema = z.object({
	winner: z.enum(["A", "B", "tie"]),
	reasoning: z.string(),
});

export const evidenceGroundednessScorer = createScorer({
	id: "pairwise-evidence-groundedness",
	description:
		"Pairwise judge over the full conversation + final summary: which arm backs its clinical claims with explicit, citable evidence (named studies, guidelines, quantitative findings) versus unsupported assertions?",
	type: {
		input: caseInputSchema,
		output: abCompareOutputSchema,
	},
	judge: {
		model: JUDGE_MODEL,
		instructions:
			"You are a clinical evidence evaluator comparing two complete triage conversations (each a multi-turn transcript plus a final submitted summary). Judge which arm's clinical claims — across the questions it asked, statements it made, and its final summary — are better grounded in explicit evidence (cited studies, named guidelines, quantitative findings). Prefer specific over generic, cited over uncited, quantified over hand-wavy. Ignore transcript length; penalize padding.",
	},
})
	.analyze({
		description: "Judge evidence-groundedness across the full conversation",
		outputSchema: analyzeSchema,
		createPrompt: ({ run }) => {
			const caseId = (run.input?.caseId as string) ?? "unknown";
			const { aIsTreatment } = positionAssignment(caseId);
			const out = run.output;
			const a = aIsTreatment ? out.treatment : out.control;
			const b = aIsTreatment ? out.control : out.treatment;
			return `Compare the evidence-groundedness of these two complete triage runs on the same patient case.

# Patient opening message
${run.input?.openingMessage ?? ""}

# Arm A
${formatArmForJudge(a)}

# Arm B
${formatArmForJudge(b)}

Which arm better grounds its clinical claims across the whole conversation and its final summary in explicit evidence (studies, guidelines, quantitative findings, cited sources)? Respond in JSON as { "winner": "A" | "B" | "tie", "reasoning": "<2-3 sentences citing specific evidence or its absence>" }.`;
		},
	})
	.generateScore(({ results, run }) => {
		const caseId = (run.input?.caseId as string) ?? "unknown";
		const { aIsTreatment } = positionAssignment(caseId);
		return winnerToScore(results.analyzeStepResult.winner, aIsTreatment);
	})
	.generateReason(({ results }) => results.analyzeStepResult.reasoning);
