import { createScorer } from "@mastra/core/evals";
import { z } from "zod";
import {
	abCompareOutputSchema,
	caseInputSchema,
	formatSummary,
} from "../../types.ts";
import { JUDGE_MODEL, positionAssignment, winnerToScore } from "../judge.ts";

const analyzeSchema = z.object({
	winner: z.enum(["A", "B", "tie", "only-one-summary"]),
	reasoning: z.string(),
});

export const finalSummaryQualityScorer = createScorer({
	id: "pairwise-final-summary-quality",
	description:
		"Pairwise judge on the two arms' final generateSummary outputs: which is the better clinical hand-off? Judges diagnostic accuracy, recommendation sharpness, red-flag identification, and evidence citation quality.",
	type: {
		input: caseInputSchema,
		output: abCompareOutputSchema,
	},
	judge: {
		model: JUDGE_MODEL,
		instructions:
			"You are evaluating two final clinical summaries handed off after a triage conversation. Judge which summary is the better hand-off to a clinician: (a) diagnostic hypotheses that are well-calibrated and ranked, (b) red flags accurately identified, (c) recommended next steps that are concrete and clinically appropriate, (d) evidence references that support the reasoning. If only one arm submitted a summary, the submitting arm wins automatically. If neither submitted, return 'tie'.",
	},
})
	.analyze({
		description: "Judge final summary quality",
		outputSchema: analyzeSchema,
		createPrompt: ({ run }) => {
			const caseId = (run.input?.caseId as string) ?? "unknown";
			const { aIsTreatment } = positionAssignment(caseId);
			const out = run.output;
			const a = aIsTreatment ? out.treatment : out.control;
			const b = aIsTreatment ? out.control : out.treatment;
			return `Compare the final clinical summaries submitted by two triage assistants on the same patient case.

# Patient opening message
${run.input?.openingMessage ?? ""}

# Arm A summary
${formatSummary(a.summary)}

# Arm B summary
${formatSummary(b.summary)}

Which summary is the better clinical hand-off? Judge diagnostic calibration, red-flag identification, recommendation sharpness, and evidence citations. Respond in JSON as { "winner": "A" | "B" | "tie" | "only-one-summary", "reasoning": "<2-3 sentences>" }. Use "only-one-summary" only when exactly one arm submitted.`;
		},
	})
	.generateScore(({ results, run }) => {
		const caseId = (run.input?.caseId as string) ?? "unknown";
		const { aIsTreatment } = positionAssignment(caseId);
		const { winner } = results.analyzeStepResult;
		if (winner === "only-one-summary") {
			const out = run.output as z.infer<typeof abCompareOutputSchema>;
			const treatmentHas = out.treatment.summary !== null;
			const controlHas = out.control.summary !== null;
			if (treatmentHas && !controlHas) return 1;
			if (controlHas && !treatmentHas) return 0;
			return 0.5;
		}
		return winnerToScore(winner, aIsTreatment);
	})
	.generateReason(({ results }) => results.analyzeStepResult.reasoning);
