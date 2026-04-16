import { createScorer } from "@mastra/core/evals";
import { z } from "zod";
import {
	abCompareOutputSchema,
	agentQuestionsFromTurns,
	caseInputSchema,
	formatTranscript,
} from "../../types.ts";
import { JUDGE_MODEL, positionAssignment, winnerToScore } from "../judge.ts";

const analyzeSchema = z.object({
	winner: z.enum(["A", "B", "tie"]),
	reasoning: z.string(),
});

export const questionQualityScorer = createScorer({
	id: "pairwise-question-quality",
	description:
		"Pairwise judge: which arm's agent questions across the conversation are more clinically informative, less redundant, and more hypothesis-probing? This is the primary signal for whether research changes how the agent interrogates the patient.",
	type: {
		input: caseInputSchema,
		output: abCompareOutputSchema,
	},
	judge: {
		model: JUDGE_MODEL,
		instructions:
			"You are a clinical educator evaluating how well two triage assistants interrogate a patient. Given two full conversations, judge which arm's sequence of questions (asked by the assistant) is: (a) more clinically informative per question, (b) less redundant with prior turns, (c) more targeted at discriminating specific hypotheses, and (d) more evidence-informed (reflects knowledge of clinical specifics, guidelines, test thresholds). Judge the QUESTIONS, not the assistant's final summary. Ignore reply length; penalize padding.",
	},
})
	.analyze({
		description: "Judge agent question quality across the full conversation",
		outputSchema: analyzeSchema,
		createPrompt: ({ run }) => {
			const caseId = (run.input?.caseId as string) ?? "unknown";
			const { aIsTreatment } = positionAssignment(caseId);
			const out = run.output;
			const a = aIsTreatment ? out.treatment : out.control;
			const b = aIsTreatment ? out.control : out.treatment;
			const aQs = agentQuestionsFromTurns(a.turns);
			const bQs = agentQuestionsFromTurns(b.turns);
			return `Compare the QUESTION QUALITY of two assistants on the same patient case. You are judging the sequence of questions each assistant asked — not their final summary.

# Patient opening message
${run.input?.openingMessage ?? ""}

# Arm A (${aQs.length} assistant turns)
## Full transcript
${formatTranscript(a.turns)}

# Arm B (${bQs.length} assistant turns)
## Full transcript
${formatTranscript(b.turns)}

Which arm's assistant asked better questions — more clinically informative, less redundant, more targeted at discriminating specific hypotheses, more evidence-informed? Respond in JSON as { "winner": "A" | "B" | "tie", "reasoning": "<2-3 sentences with concrete examples of strong or weak questions>" }.`;
		},
	})
	.generateScore(({ results, run }) => {
		const caseId = (run.input?.caseId as string) ?? "unknown";
		const { aIsTreatment } = positionAssignment(caseId);
		return winnerToScore(results.analyzeStepResult.winner, aIsTreatment);
	})
	.generateReason(({ results }) => results.analyzeStepResult.reasoning);
