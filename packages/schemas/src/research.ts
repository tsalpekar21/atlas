import { z } from "zod";

// --- Hypothesis representation (shared between request and outcome) ---

export const hypothesisSchema = z.object({
	label: z.string(),
	systemsInvolved: z.array(z.string()),
	confidence: z.number().min(0).max(1),
	supportingEvidence: z.array(z.string()),
	contradictingEvidence: z.array(z.string()),
});

export type Hypothesis = z.infer<typeof hypothesisSchema>;

// --- Research request (triage -> orchestrator) ---

export const riskLevelSchema = z.enum([
	"low",
	"moderate",
	"high",
	"emergency",
]);

export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const researchRequestSchema = z.object({
	caseSummary: z.string(),
	hypotheses: z.array(hypothesisSchema),
	unknowns: z.array(z.string()),
	researchGoals: z.array(z.string()),
	riskLevel: riskLevelSchema,
	maxDepth: z.number().int().positive().default(3),
	userContext: z.string(),
});

export type ResearchRequest = z.infer<typeof researchRequestSchema>;

// --- Research task (orchestrator -> worker) ---

export const researchTaskSchema = z.object({
	question: z.string(),
	sourcePreferences: z.array(z.string()).optional(),
	exclusionRules: z.array(z.string()).optional(),
	expectedOutput: z.string().optional(),
});

export type ResearchTask = z.infer<typeof researchTaskSchema>;

// --- Evidence item (worker -> orchestrator) ---

export const sourceQualitySchema = z.enum([
	"gold",
	"guideline",
	"peer-reviewed",
	"web",
	"unknown",
]);

export type SourceQuality = z.infer<typeof sourceQualitySchema>;

export const evidenceRelationshipSchema = z.enum([
	"supports",
	"contradicts",
	"neutral",
]);

export type EvidenceRelationship = z.infer<typeof evidenceRelationshipSchema>;

export const evidenceItemSchema = z.object({
	claim: z.string(),
	source: z.string(),
	sourceQuality: sourceQualitySchema,
	relationship: evidenceRelationshipSchema,
	hypothesisLabel: z.string(),
	extractedFacts: z.array(z.string()),
	confidence: z.number().min(0).max(1),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

// --- Hypothesis ranking update (part of research outcome) ---

export const hypothesisRankingSchema = z.object({
	label: z.string(),
	previousConfidence: z.number().min(0).max(1),
	newConfidence: z.number().min(0).max(1),
	reason: z.string(),
});

export type HypothesisRanking = z.infer<typeof hypothesisRankingSchema>;

// --- Research outcome (orchestrator -> triage) ---

export const researchOutcomeSchema = z.object({
	updatedRankings: z.array(hypothesisRankingSchema),
	evidenceItems: z.array(evidenceItemSchema),
	suggestedNextQuestions: z.array(z.string()),
	escalationFlags: z.array(z.string()),
	openQuestions: z.array(z.string()),
	whatChanged: z.string(),
});

export type ResearchOutcome = z.infer<typeof researchOutcomeSchema>;
