import { createScorer } from "@mastra/core/evals";
import { z } from "zod";
import {
	abCompareOutputSchema,
	caseGoldSchema,
	caseInputSchema,
	formatArmForJudge,
} from "../../types.ts";
import { JUDGE_MODEL } from "../judge.ts";

const analyzeSchema = z.object({
	treatmentCovered: z.array(z.string()),
	treatmentMissed: z.array(z.string()),
	controlCovered: z.array(z.string()),
	controlMissed: z.array(z.string()),
	reasoning: z.string(),
});

export const mustCoverCoverageScorer = createScorer({
	id: "reference-must-cover-coverage",
	description:
		"Reference-based: fraction of gold must-cover points the treatment arm addresses in its final summary (primary) or conversation. Measures clinical-completeness delta vs control.",
	type: {
		input: caseInputSchema,
		output: abCompareOutputSchema,
	},
	judge: {
		model: JUDGE_MODEL,
		instructions:
			"You are evaluating clinical completeness of triage runs. Given a list of points a good triage run must cover, judge whether each arm covers each point — explicitly or by clearly addressing the underlying issue — anywhere in its final summary (primary surface) or conversation (secondary). Be reasonable: a point is 'covered' if a knowledgeable reader would recognize it's been addressed. Return the points verbatim from the input list.",
	},
})
	.analyze({
		description:
			"Identify which must-cover points each arm addresses across conversation + summary",
		outputSchema: analyzeSchema,
		createPrompt: ({ run }) => {
			const gold = caseGoldSchema.safeParse(run.groundTruth);
			const points = gold.success ? gold.data.mustCoverPoints : [];
			return `For each must-cover point below, determine whether each arm addresses it — in its final summary (primary) or anywhere in its conversation.

# Must-cover points (score each one)
${points.map((p, i) => `${i + 1}. ${p}`).join("\n") || "(none)"}

# Treatment arm
${formatArmForJudge(run.output.treatment)}

# Control arm
${formatArmForJudge(run.output.control)}

Respond in JSON with the exact shape:
{
  "treatmentCovered": [...verbatim points...],
  "treatmentMissed":  [...verbatim points...],
  "controlCovered":   [...verbatim points...],
  "controlMissed":    [...verbatim points...],
  "reasoning": "<2-3 sentences>"
}`;
		},
	})
	.generateScore(({ results, run }) => {
		const gold = caseGoldSchema.safeParse(run.groundTruth);
		const total = gold.success ? gold.data.mustCoverPoints.length : 0;
		if (total === 0) return 1;
		return results.analyzeStepResult.treatmentCovered.length / total;
	})
	.generateReason(({ results, run }) => {
		const gold = caseGoldSchema.safeParse(run.groundTruth);
		const total = gold.success ? gold.data.mustCoverPoints.length : 0;
		const t = results.analyzeStepResult.treatmentCovered.length;
		const c = results.analyzeStepResult.controlCovered.length;
		return `treatment ${t}/${total}, control ${c}/${total}. ${results.analyzeStepResult.reasoning}`;
	});
