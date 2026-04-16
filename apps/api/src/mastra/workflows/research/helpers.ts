import { z } from "zod";
import type { ResearchSynthesis } from "../../../services/research.ts";

/**
 * Shared Zod schemas and pure helpers extracted from
 * `background-research.ts` so they can be unit-tested without spinning
 * up the workflow runtime.
 *
 * The workflow file still owns the actual step definitions and
 * composition; everything in here is schema-first or stateless logic.
 */

// ---------- Schemas (piped between steps via `.then(...)` / `.parallel(...)`) ----------

export const workflowInputSchema = z.object({
	threadId: z.string().min(1),
	userId: z.string().min(1),
});

export const workflowOutputSchema = z.object({
	status: z.enum(["complete", "skipped", "failed"]),
	roundId: z.string().optional(),
	reason: z.string().optional(),
});
export type WorkflowOutput = z.infer<typeof workflowOutputSchema>;

export const loadedContextSchema = z.object({
	threadId: z.string(),
	userId: z.string(),
	chart: z.string(),
	chartHash: z.string(),
});

export const focusItemSchema = z.object({
	label: z.string(),
	kind: z.enum(["hypothesis", "condition", "goal"]),
	systems: z.array(z.string()),
	confidence: z.number(),
	notes: z.array(z.string()),
});

export const plannedBriefSchema = z.object({
	threadId: z.string(),
	userId: z.string(),
	chartHash: z.string(),
	brief: z.object({
		mode: z.enum(["triage", "treatment", "goals"]),
		context: z.string(),
		focusItems: z.array(focusItemSchema),
		unknowns: z.array(z.string()),
		researchQuestions: z.array(z.string()),
		riskLevel: z.enum(["routine", "soon", "urgent", "emergency"]),
	}),
});

export const runningRoundSchema = plannedBriefSchema.extend({
	roundId: z.string(),
});
export type RunningRoundInput = z.infer<typeof runningRoundSchema>;

/**
 * Each parallel worker returns this shape. We pass through the
 * threadId + roundId + brief alongside the raw LLM text so the
 * synthesize step can pick them off any one of the three workers —
 * the parallel block's output type is a record keyed by step id and
 * does not carry the previous step's input forward, so every worker
 * has to re-emit the fields the synthesizer needs.
 *
 * `retrievedChunkIds` is populated only by the rag worker (extracted
 * from the agent's tool-call trace). The synthesize step uses it to
 * compute the adoption rate of corpus chunks into final evidence —
 * our primary online relevance metric. PubMed workers leave it
 * undefined.
 */
export const workerOutputSchema = z.object({
	threadId: z.string(),
	roundId: z.string(),
	brief: runningRoundSchema.shape.brief,
	workerText: z.string(),
	retrievedChunkIds: z.array(z.string()).optional(),
});
export type WorkerOutput = z.infer<typeof workerOutputSchema>;

// ---------- Pure helpers ----------

/**
 * Parse the synthesizer's JSON response into a `ResearchSynthesis`. The
 * synthesizer is prompted to emit strict JSON, but we still guard against
 * markdown fences and stray prose so a minor formatting slip doesn't kill
 * a round — on parse failure we fall back to a minimal synthesis.
 */
export function parseSynthesisJson(raw: string): ResearchSynthesis {
	const stripped = raw
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();

	const tryParse = (s: string): ResearchSynthesis | null => {
		try {
			return JSON.parse(s) as ResearchSynthesis;
		} catch {
			return null;
		}
	};

	const direct = tryParse(stripped);
	if (direct) return { ...direct, rawText: raw };

	const match = stripped.match(/\{[\s\S]*\}/);
	if (match) {
		const fallback = tryParse(match[0]);
		if (fallback) return { ...fallback, rawText: raw };
	}

	// Minimal synthesis when the model response can't be parsed at all —
	// downstream still gets a valid row but with empty arrays.
	return {
		evidenceItems: [],
		suggestedQuestions: [],
		escalationFlags: [],
		openQuestions: [],
		whatChanged: "synthesizer returned unparseable output",
		rawText: raw,
	};
}

/**
 * Shared prompt helper: workers all consume the same brief; the synthesizer
 * reads their raw text outputs. Keeping the prompt shape consistent across
 * workers lets the synthesizer concatenate them without per-worker parsing.
 */
export function buildWorkerPrompt(brief: RunningRoundInput["brief"]): string {
	return `You are receiving a research brief. Use your tool (if you have one) to find evidence and then emit your response per your instructions.

Brief:
${JSON.stringify(brief, null, 2)}`;
}

/**
 * Extract the set of chunk ids the rag agent saw from the generate
 * result's per-step tool results. Each ragSearch tool call returns
 * `{ results: [{ chunkId, ... }], ... }` — we walk every step (the
 * agent may tool-call more than once in theory; in practice it's
 * once) and union the chunkIds. Defensive against missing fields so
 * a change in Mastra's tool-result shape can't crash the workflow.
 */
export function extractRetrievedChunkIds(steps: unknown): string[] {
	const seen = new Set<string>();
	if (!Array.isArray(steps)) return [];
	for (const step of steps) {
		const toolResults = (step as { toolResults?: unknown[] }).toolResults;
		if (!Array.isArray(toolResults)) continue;
		for (const tr of toolResults) {
			const record = tr as {
				toolName?: string;
				output?: { results?: unknown[] };
				result?: { results?: unknown[] };
			};
			if (record.toolName !== "ragSearch") continue;
			// AI SDK v6 exposes `output` on static tool results; older shapes
			// use `result`. Support both so a minor SDK bump doesn't break us.
			const results = record.output?.results ?? record.result?.results;
			if (!Array.isArray(results)) continue;
			for (const r of results) {
				const chunkId = (r as { chunkId?: unknown }).chunkId;
				if (typeof chunkId === "string" && chunkId.length > 0) {
					seen.add(chunkId);
				}
			}
		}
	}
	return Array.from(seen);
}

/**
 * Compute how many of the rag worker's retrieved chunks got cited in
 * the final synthesis. Matching is done by substring on the
 * `chunkId=<id>` suffix the rag researcher is prompted to embed in
 * every evidence-item `source` string. This is our primary online
 * signal for RAG relevance — low adoption over many rounds means
 * queries or corpus content are mismatched.
 *
 * Returns `undefined` when no chunks were retrieved so consumers can
 * distinguish "no-op run" from "0% adoption".
 */
export function computeRagMetrics(
	retrievedChunkIds: string[] | undefined,
	evidenceItems: ResearchSynthesis["evidenceItems"],
): ResearchSynthesis["ragMetrics"] | undefined {
	if (!retrievedChunkIds || retrievedChunkIds.length === 0) return undefined;
	const retrieved = retrievedChunkIds.length;
	const citedChunkIds = new Set<string>();
	const citedPageSources = new Set<string>();

	for (const item of evidenceItems ?? []) {
		if (item.sourceQuality !== "functional-medicine-corpus") continue;
		const source = item.source ?? "";
		for (const chunkId of retrievedChunkIds) {
			if (source.includes(`chunkId=${chunkId}`)) {
				citedChunkIds.add(chunkId);
				// Strip the chunkId suffix so we can count unique pages cited.
				const pageKey = source.replace(/\s*\|\s*chunkId=[^|]+$/, "").trim();
				if (pageKey) citedPageSources.add(pageKey);
				break;
			}
		}
	}
	const cited = citedChunkIds.size;
	return {
		retrieved,
		cited,
		adoptionRate: retrieved > 0 ? cited / retrieved : 0,
		uniquePagesCited: citedPageSources.size,
	};
}
