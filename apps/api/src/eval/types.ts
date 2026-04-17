import { z } from "zod";

export const patientProfileSchema = z.object({
	demographicsAndHistory: z.string(),
	currentSymptomsDetail: z.string(),
	revealOnlyIfAsked: z.array(z.string()).default([]),
	stance: z.string(),
});
export type PatientProfile = z.infer<typeof patientProfileSchema>;

export const caseInputSchema = z.object({
	caseId: z.string().min(1),
	mode: z.enum(["triage", "treatment", "goals"]),
	severity: z.enum(["none", "mild", "urgent"]),
	chartMarkdown: z.string().min(1),
	patientProfile: patientProfileSchema,
	openingMessage: z.string().min(1),
	userId: z.string().min(1).default("eval-user"),
});
export type CaseInput = z.infer<typeof caseInputSchema>;

export const caseGoldSchema = z.object({
	focusItems: z.array(z.string()).default([]),
	redFlags: z.array(z.string()).default([]),
	mustCoverPoints: z.array(z.string()).default([]),
	mustNotClaim: z.array(z.string()).default([]),
	minimumCitationsInSummary: z.number().int().nonnegative().default(0),
	notes: z.string().optional(),
});
export type CaseGold = z.infer<typeof caseGoldSchema>;

export const summarySchema = z.object({
	diagnosticHypotheses: z
		.array(
			z.object({
				label: z.string(),
				confidence: z.number().min(0).max(1),
				reasoning: z.string(),
			}),
		)
		.default([]),
	redFlagsIdentified: z.array(z.string()).default([]),
	recommendedNextSteps: z.array(z.string()).default([]),
	evidenceReferences: z
		.array(z.object({ claim: z.string(), source: z.string().optional() }))
		.default([]),
	openQuestions: z.array(z.string()).default([]),
});
export type Summary = z.infer<typeof summarySchema>;

export const turnSchema = z.object({
	role: z.enum(["patient", "agent"]),
	content: z.string(),
	toolCalls: z
		.array(
			z.object({
				toolName: z.string(),
				args: z.unknown(),
			}),
		)
		.optional(),
});
export type Turn = z.infer<typeof turnSchema>;

export const armOutcomeSchema = z.object({
	threadId: z.string(),
	turns: z.array(turnSchema),
	summary: summarySchema.nullable(),
	turnsUsed: z.number().int().nonnegative(),
	reachedSummary: z.boolean(),
	ms: z.number(),
});
export type ArmOutcome = z.infer<typeof armOutcomeSchema>;

export const researchStatsSchema = z.object({
	totalInvocations: z.number().int().nonnegative(),
	completedRounds: z.number().int().nonnegative(),
	skippedRounds: z.number().int().nonnegative(),
	failedRounds: z.number().int().nonnegative(),
	totalMs: z.number(),
	finalRoundId: z.string().nullable(),
	finalFinding: z.unknown().nullable(),
});
export type ResearchStats = z.infer<typeof researchStatsSchema>;

export const abCompareOutputSchema = z.object({
	control: armOutcomeSchema,
	treatment: armOutcomeSchema,
	research: researchStatsSchema,
});
export type AbCompareOutput = z.infer<typeof abCompareOutputSchema>;

export function formatTranscript(turns: Turn[]): string {
	return turns
		.map((t) => {
			const prefix = t.role === "patient" ? "PATIENT" : "ASSISTANT";
			const toolPart =
				t.toolCalls && t.toolCalls.length > 0
					? `\n  [tool calls: ${t.toolCalls.map((c) => c.toolName).join(", ")}]`
					: "";
			return `${prefix}: ${t.content}${toolPart}`;
		})
		.join("\n\n");
}

export function agentQuestionsFromTurns(turns: Turn[]): string[] {
	return turns
		.filter((t) => t.role === "agent")
		.map((t) => t.content)
		.filter((c) => c.trim().length > 0);
}

export function formatSummary(summary: Summary | null): string {
	if (!summary) return "(no summary — the agent did not call generateSummary)";
	const hyp = summary.diagnosticHypotheses
		.map(
			(h) =>
				`  - ${h.label} (confidence ${h.confidence.toFixed(2)}): ${h.reasoning}`,
		)
		.join("\n");
	const steps = summary.recommendedNextSteps.map((s) => `  - ${s}`).join("\n");
	const flags = summary.redFlagsIdentified.map((f) => `  - ${f}`).join("\n");
	const evidence = summary.evidenceReferences
		.map((e) => `  - ${e.claim}${e.source ? ` [${e.source}]` : ""}`)
		.join("\n");
	const open = summary.openQuestions.map((q) => `  - ${q}`).join("\n");
	return [
		"Diagnostic hypotheses:",
		hyp || "  (none)",
		"",
		"Red flags identified:",
		flags || "  (none)",
		"",
		"Recommended next steps:",
		steps || "  (none)",
		"",
		"Evidence references:",
		evidence || "  (none)",
		"",
		"Open questions:",
		open || "  (none)",
	].join("\n");
}

export function formatArmForJudge(arm: ArmOutcome): string {
	return `# Transcript

${formatTranscript(arm.turns)}

# Final summary

${formatSummary(arm.summary)}

# Meta
turns used: ${arm.turnsUsed} / 10${arm.reachedSummary ? "" : "  (did not submit a summary)"}
`;
}
