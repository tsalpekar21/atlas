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

export const factualCorrectnessScorer = createScorer({
	id: "pairwise-factual-correctness",
	description:
		"Pairwise judge over the full conversation + final summary: which arm contains fewer factual errors (incorrect mechanisms, wrong drug-condition pairings, misstated guideline thresholds, hallucinated studies)?",
	type: {
		input: caseInputSchema,
		output: abCompareOutputSchema,
	},
	judge: {
		model: JUDGE_MODEL,
		instructions:
			"You are a medical fact-checker comparing two complete triage runs. Your only job is to pick the arm with fewer factual errors across its questions, statements, and final summary: incorrect mechanisms, wrong drug-condition pairings, misstated guideline thresholds, hallucinated studies, outdated recommendations. Ignore stylistic differences. A tie is appropriate only when both arms are factually equivalent.",
	},
})
	.analyze({
		description: "Fact-check each arm across the full conversation",
		outputSchema: analyzeSchema,
		createPrompt: ({ run }) => {
			const caseId = (run.input?.caseId as string) ?? "unknown";
			const { aIsTreatment } = positionAssignment(caseId);
			const out = run.output;
			const a = aIsTreatment ? out.treatment : out.control;
			const b = aIsTreatment ? out.control : out.treatment;
			return `Fact-check two complete triage runs on the same patient case and pick the one with fewer factual errors.

# Patient opening message
${run.input?.openingMessage ?? ""}

# Arm A
${formatArmForJudge(a)}

# Arm B
${formatArmForJudge(b)}

Which arm contains fewer factual errors (incorrect mechanisms, wrong drug-condition pairings, misstated guideline thresholds, hallucinated studies) across the whole conversation and its final summary? Respond in JSON as { "winner": "A" | "B" | "tie", "reasoning": "<2-3 sentences identifying specific errors if any>" }.`;
		},
	})
	.generateScore(({ results, run }) => {
		const caseId = (run.input?.caseId as string) ?? "unknown";
		const { aIsTreatment } = positionAssignment(caseId);
		return winnerToScore(results.analyzeStepResult.winner, aIsTreatment);
	})
	.generateReason(({ results }) => results.analyzeStepResult.reasoning);
