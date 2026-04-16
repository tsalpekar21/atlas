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

export const specificityScorer = createScorer({
	id: "pairwise-specificity",
	description:
		"Pairwise judge over the full conversation + final summary: which arm produces more concrete, patient-specific next steps (named tests, dosages, interventions, decision criteria) tailored to THIS patient?",
	type: {
		input: caseInputSchema,
		output: abCompareOutputSchema,
	},
	judge: {
		model: JUDGE_MODEL,
		instructions:
			"You are evaluating the actionability of complete triage runs. Compare two arms and pick the one that produces more concrete, patient-specific next steps across its questions, statements, and final summary: named tests, specific dosages, named interventions, clear decision criteria, tailored to THIS patient. Penalize generic advice that could apply to anyone. Penalize padding.",
	},
})
	.analyze({
		description: "Judge specificity across the full conversation",
		outputSchema: analyzeSchema,
		createPrompt: ({ run }) => {
			const caseId = (run.input?.caseId as string) ?? "unknown";
			const { aIsTreatment } = positionAssignment(caseId);
			const out = run.output;
			const a = aIsTreatment ? out.treatment : out.control;
			const b = aIsTreatment ? out.control : out.treatment;
			return `Compare the specificity and actionability of these two complete triage runs.

# Patient case summary
Mode: ${run.input?.mode ?? ""}
Severity: ${run.input?.severity ?? ""}
Opening message: ${run.input?.openingMessage ?? ""}

# Arm A
${formatArmForJudge(a)}

# Arm B
${formatArmForJudge(b)}

Which arm gives more concrete, patient-specific next steps (named tests, dosages, interventions, decision criteria) across the whole conversation and its final summary? Respond in JSON as { "winner": "A" | "B" | "tie", "reasoning": "<2-3 sentences>" }.`;
		},
	})
	.generateScore(({ results, run }) => {
		const caseId = (run.input?.caseId as string) ?? "unknown";
		const { aIsTreatment } = positionAssignment(caseId);
		return winnerToScore(results.analyzeStepResult.winner, aIsTreatment);
	})
	.generateReason(({ results }) => results.analyzeStepResult.reasoning);
