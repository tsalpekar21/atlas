import { logger } from "@atlas/logger";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { publishResearchStatus } from "../../inngest/realtime-bus.ts";
import {
	computeChartHash,
	extractBriefFromChart,
	getLastCompletedHash,
	getThreadChart,
	insertRunningRound,
	insertSkippedRound,
	markRoundComplete,
	markRoundFailed,
	type PlannerBrief,
	type ResearchSynthesis,
} from "../../services/research.ts";

// ---------- Schemas (piped between steps via `.then(...)` / `.parallel(...)`) ----------

const workflowInputSchema = z.object({
	threadId: z.string().min(1),
	userId: z.string().min(1),
});

const workflowOutputSchema = z.object({
	status: z.enum(["complete", "skipped", "failed"]),
	roundId: z.string().optional(),
	reason: z.string().optional(),
});
type WorkflowOutput = z.infer<typeof workflowOutputSchema>;

const loadedContextSchema = z.object({
	threadId: z.string(),
	userId: z.string(),
	chart: z.string(),
	chartHash: z.string(),
});

const focusItemSchema = z.object({
	label: z.string(),
	kind: z.enum(["hypothesis", "condition", "goal"]),
	systems: z.array(z.string()),
	confidence: z.number(),
	notes: z.array(z.string()),
});

const plannedBriefSchema = z.object({
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

const runningRoundSchema = plannedBriefSchema.extend({
	roundId: z.string(),
});

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
const workerOutputSchema = z.object({
	threadId: z.string(),
	roundId: z.string(),
	brief: runningRoundSchema.shape.brief,
	workerText: z.string(),
	retrievedChunkIds: z.array(z.string()).optional(),
});
type WorkerOutput = z.infer<typeof workerOutputSchema>;

// ---------- Helpers ----------

/**
 * Parse the synthesizer's JSON response into a `ResearchSynthesis`. The
 * synthesizer is prompted to emit strict JSON, but we still guard against
 * markdown fences and stray prose so a minor formatting slip doesn't kill
 * a round — on parse failure we fall back to a minimal synthesis.
 */
function parseSynthesisJson(raw: string): ResearchSynthesis {
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

// ---------- Steps ----------

/**
 * All workflow steps log through this namespaced child so Pino entries are
 * trivially greppable. Keep field names stable (`step`, `threadId`, `runId`,
 * `roundId`, `durationMs`) — downstream tooling and dashboards depend on them.
 */
const stepLog = logger.child({ component: "research.workflow" });

/**
 * Read the working memory chart for the thread and compute the gate hash.
 * Bails out of the workflow immediately when the chart is empty (nothing to
 * research yet).
 */
const loadContextStep = createStep({
	id: "load-context",
	inputSchema: workflowInputSchema,
	outputSchema: loadedContextSchema,
	execute: async ({ inputData, mastra, bail, runId }) => {
		const { threadId, userId } = inputData;
		const startedAt = Date.now();
		stepLog.info({ step: "load-context", threadId, runId }, "step start");
		publishResearchStatus(threadId, { status: "planning" });

		const chart = await getThreadChart(mastra, threadId, userId);
		const chartHash = computeChartHash(chart);

		if (!chart.trim()) {
			stepLog.info(
				{
					step: "load-context",
					threadId,
					runId,
					durationMs: Date.now() - startedAt,
					outcome: "bail",
					reason: "empty-chart",
				},
				"step end",
			);
			publishResearchStatus(threadId, {
				status: "skipped",
				reason: "empty-chart",
			});
			return bail({
				status: "skipped",
				reason: "empty-chart",
			} satisfies WorkflowOutput);
		}

		stepLog.info(
			{
				step: "load-context",
				threadId,
				runId,
				durationMs: Date.now() - startedAt,
				chartHash,
				chartLength: chart.length,
			},
			"step end",
		);
		return { threadId, userId, chart, chartHash };
	},
});

/**
 * Skip the round if the chart hash matches the last completed round's hash —
 * nothing interview-relevant has changed, so there is no reason to burn LLM
 * calls re-researching.
 */
const gateByHashStep = createStep({
	id: "gate-by-hash",
	inputSchema: loadedContextSchema,
	outputSchema: loadedContextSchema,
	execute: async ({ inputData, bail, runId }) => {
		const { threadId, userId, chartHash } = inputData;
		const startedAt = Date.now();
		stepLog.info(
			{ step: "gate-by-hash", threadId, runId, chartHash },
			"step start",
		);

		const lastHash = await getLastCompletedHash(threadId);
		if (lastHash && lastHash === chartHash) {
			await insertSkippedRound({
				threadId,
				userId,
				chartHash,
				reason: "chart unchanged since last round",
			});
			stepLog.info(
				{
					step: "gate-by-hash",
					threadId,
					runId,
					durationMs: Date.now() - startedAt,
					outcome: "bail",
					reason: "chart-unchanged",
				},
				"step end",
			);
			publishResearchStatus(threadId, {
				status: "skipped",
				reason: "chart-unchanged",
			});
			return bail({
				status: "skipped",
				reason: "chart-unchanged",
			} satisfies WorkflowOutput);
		}

		stepLog.info(
			{
				step: "gate-by-hash",
				threadId,
				runId,
				durationMs: Date.now() - startedAt,
				outcome: "pass",
			},
			"step end",
		);
		return inputData;
	},
});

/**
 * Deterministically build the research brief from the chart — no LLM call.
 * Replaces the former `plan-research` step (which asked an agent to judge
 * `shouldResearch` and build a brief). Both jobs are structural enough to
 * do with a parser; the LLM round-trip was pure latency.
 *
 * Bails if the chart has nothing worth researching yet.
 */
const extractBriefStep = createStep({
	id: "extract-brief",
	inputSchema: loadedContextSchema,
	outputSchema: plannedBriefSchema,
	execute: async ({ inputData, bail, runId }) => {
		const { threadId, userId, chart, chartHash } = inputData;
		const startedAt = Date.now();
		stepLog.info({ step: "extract-brief", threadId, runId }, "step start");

		const decision = extractBriefFromChart(chart);
		if (!decision.shouldResearch || !decision.brief) {
			const reason = decision.reason;
			await insertSkippedRound({ threadId, userId, chartHash, reason });
			stepLog.info(
				{
					step: "extract-brief",
					threadId,
					runId,
					durationMs: Date.now() - startedAt,
					outcome: "bail",
					reason,
				},
				"step end",
			);
			publishResearchStatus(threadId, { status: "skipped", reason });
			return bail({ status: "skipped", reason } satisfies WorkflowOutput);
		}

		stepLog.info(
			{
				step: "extract-brief",
				threadId,
				runId,
				durationMs: Date.now() - startedAt,
				mode: decision.brief.mode,
				focusItemCount: decision.brief.focusItems.length,
				unknownCount: decision.brief.unknowns.length,
				researchQuestionCount: decision.brief.researchQuestions.length,
				riskLevel: decision.brief.riskLevel,
			},
			"step end",
		);
		return { threadId, userId, chartHash, brief: decision.brief };
	},
});

/**
 * Create the research_findings row for the running round so we can
 * fail-or-complete it later, then hand it to the parallel worker block.
 */
const insertRunningStep = createStep({
	id: "insert-running",
	inputSchema: plannedBriefSchema,
	outputSchema: runningRoundSchema,
	execute: async ({ inputData, runId }) => {
		const { threadId, userId, chartHash, brief } = inputData;
		const startedAt = Date.now();
		stepLog.info({ step: "insert-running", threadId, runId }, "step start");

		const roundId = await insertRunningRound({
			threadId,
			userId,
			chartHash,
			brief: brief as PlannerBrief,
		});
		stepLog.info(
			{
				step: "insert-running",
				threadId,
				runId,
				roundId,
				durationMs: Date.now() - startedAt,
			},
			"step end",
		);
		publishResearchStatus(threadId, { status: "researching", roundId });
		return { ...inputData, roundId };
	},
});

/**
 * Shared prompt helper: workers all consume the same brief; the synthesizer
 * reads their raw text outputs. Keeping the prompt shape consistent across
 * workers lets the synthesizer concatenate them without per-worker parsing.
 */
function buildWorkerPrompt(brief: RunningRoundInput["brief"]): string {
	return `You are receiving a research brief. Use your tool (if you have one) to find evidence and then emit your response per your instructions.

Brief:
${JSON.stringify(brief, null, 2)}`;
}

type RunningRoundInput = z.infer<typeof runningRoundSchema>;

/**
 * Guideline worker — wraps `mastra.getAgent('guidelineResearcher')`. The
 * agent itself owns the PubMed tool call and the prompt shape; this step
 * is a thin adapter that turns "workflow step input" into "agent prompt"
 * and captures the response text for the synthesizer.
 */
const guidelineWorkerStep = createStep({
	id: "guideline-worker",
	inputSchema: runningRoundSchema,
	outputSchema: workerOutputSchema,
	execute: async ({ inputData, mastra, runId }) => {
		const { threadId, roundId, brief } = inputData;
		const startedAt = Date.now();
		stepLog.info(
			{ step: "guideline-worker", threadId, runId, roundId },
			"step start",
		);

		try {
			const agent = mastra.getAgent("guidelineResearcher");
			const result = await agent.generate(buildWorkerPrompt(brief));
			stepLog.info(
				{
					step: "guideline-worker",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					outputLength: result.text.length,
				},
				"step end",
			);
			return { threadId, roundId, brief, workerText: result.text };
		} catch (err) {
			stepLog.warn(
				{
					step: "guideline-worker",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					err,
				},
				"worker failed — returning empty",
			);
			return { threadId, roundId, brief, workerText: "" };
		}
	},
});

/**
 * Literature worker — same shape as guidelineWorkerStep, different agent.
 * Runs in parallel with guideline and rag workers.
 */
const literatureWorkerStep = createStep({
	id: "literature-worker",
	inputSchema: runningRoundSchema,
	outputSchema: workerOutputSchema,
	execute: async ({ inputData, mastra, runId }) => {
		const { threadId, roundId, brief } = inputData;
		const startedAt = Date.now();
		stepLog.info(
			{ step: "literature-worker", threadId, runId, roundId },
			"step start",
		);

		try {
			const agent = mastra.getAgent("literatureResearcher");
			const result = await agent.generate(buildWorkerPrompt(brief));
			stepLog.info(
				{
					step: "literature-worker",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					outputLength: result.text.length,
				},
				"step end",
			);
			return { threadId, roundId, brief, workerText: result.text };
		} catch (err) {
			stepLog.warn(
				{
					step: "literature-worker",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					err,
				},
				"worker failed — returning empty",
			);
			return { threadId, roundId, brief, workerText: "" };
		}
	},
});

/**
 * Extract the set of chunk ids the rag agent saw from the generate
 * result's per-step tool results. Each ragSearch tool call returns
 * `{ results: [{ chunkId, ... }], ... }` — we walk every step (the
 * agent may tool-call more than once in theory; in practice it's
 * once) and union the chunkIds. Defensive against missing fields so
 * a change in Mastra's tool-result shape can't crash the workflow.
 */
function extractRetrievedChunkIds(steps: unknown): string[] {
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
 * Functional medicine corpus worker — wraps the `ragResearcher` agent.
 * Runs in parallel with the two PubMed workers. Pulls the set of
 * retrieved chunk ids out of the agent's tool-call trace so the
 * synthesize step can compute corpus-chunk adoption rate.
 */
const ragWorkerStep = createStep({
	id: "rag-worker",
	inputSchema: runningRoundSchema,
	outputSchema: workerOutputSchema,
	execute: async ({ inputData, mastra, runId }) => {
		const { threadId, roundId, brief } = inputData;
		const startedAt = Date.now();
		stepLog.info(
			{ step: "rag-worker", threadId, runId, roundId },
			"step start",
		);

		try {
			const agent = mastra.getAgent("ragResearcher");
			const result = await agent.generate(buildWorkerPrompt(brief));
			const retrievedChunkIds = extractRetrievedChunkIds(
				(result as { steps?: unknown }).steps,
			);
			stepLog.info(
				{
					step: "rag-worker",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					outputLength: result.text.length,
					retrievedChunkCount: retrievedChunkIds.length,
				},
				"step end",
			);
			return {
				threadId,
				roundId,
				brief,
				workerText: result.text,
				retrievedChunkIds,
			};
		} catch (err) {
			stepLog.warn(
				{
					step: "rag-worker",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					err,
				},
				"worker failed — returning empty",
			);
			return {
				threadId,
				roundId,
				brief,
				workerText: "",
				retrievedChunkIds: [],
			};
		}
	},
});

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
function computeRagMetrics(
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

/**
 * Synthesize step — the one and only LLM reasoning pass over the
 * combined worker outputs. Consumes the parallel block's output (a
 * record keyed by step id), invokes the `researchSynthesizer` agent
 * with a structured prompt, parses the JSON response, persists the
 * completed round, and publishes final status.
 */
const synthesizeStep = createStep({
	id: "synthesize",
	inputSchema: z.object({
		"guideline-worker": workerOutputSchema,
		"literature-worker": workerOutputSchema,
		"rag-worker": workerOutputSchema,
	}),
	outputSchema: workflowOutputSchema,
	execute: async ({ inputData, mastra, runId }) => {
		// All three workers received the same input upstream and each
		// re-emits threadId/roundId/brief in its output, so we can pick any
		// one for the synthesis context + persistence.
		const anyWorker: WorkerOutput =
			inputData["guideline-worker"] ??
			inputData["literature-worker"] ??
			inputData["rag-worker"];
		const { threadId, roundId, brief } = anyWorker;

		const startedAt = Date.now();
		stepLog.info(
			{ step: "synthesize", threadId, runId, roundId },
			"step start",
		);
		publishResearchStatus(threadId, { status: "synthesizing", roundId });

		try {
			const agent = mastra.getAgent("researchSynthesizer");

			const prompt = `You are merging the outputs of three parallel research workers into a single structured synthesis. Return JSON only — see your instructions for the exact shape.

# Research brief

${JSON.stringify(brief, null, 2)}

# Guideline worker output

${inputData["guideline-worker"].workerText || "(no response)"}

# Literature worker output

${inputData["literature-worker"].workerText || "(no response)"}

# Functional medicine corpus worker output

${inputData["rag-worker"].workerText || "(no response)"}

Now emit the JSON synthesis object.`;

			const result = await agent.generate(prompt);
			const synthesis = parseSynthesisJson(result.text);

			// Capture the raw worker text alongside the parsed synthesis so
			// the dev debug panel can surface what each worker actually said.
			// Rides inside the existing `synthesis` jsonb column — no schema
			// change needed.
			synthesis.workerOutputs = {
				guideline: inputData["guideline-worker"].workerText,
				literature: inputData["literature-worker"].workerText,
				rag: inputData["rag-worker"].workerText,
			};

			// Compute RAG chunk adoption rate — cited / retrieved. Stored on
			// the synthesis jsonb; visible in the debug panel and queryable
			// across rounds for aggregate relevance analysis.
			const ragMetrics = computeRagMetrics(
				inputData["rag-worker"].retrievedChunkIds,
				synthesis.evidenceItems,
			);
			if (ragMetrics) synthesis.ragMetrics = ragMetrics;

			await markRoundComplete({ id: roundId, synthesis });

			if (synthesis.escalationFlags && synthesis.escalationFlags.length > 0) {
				stepLog.warn(
					{
						step: "synthesize",
						threadId,
						runId,
						roundId,
						flags: synthesis.escalationFlags,
					},
					"escalation flags detected",
				);
			}

			stepLog.info(
				{
					step: "synthesize",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					evidenceCount: synthesis.evidenceItems?.length ?? 0,
					suggestedQuestionCount: synthesis.suggestedQuestions?.length ?? 0,
					escalationCount: synthesis.escalationFlags?.length ?? 0,
					ragRetrieved: ragMetrics?.retrieved,
					ragCited: ragMetrics?.cited,
					ragAdoptionRate: ragMetrics?.adoptionRate,
				},
				"step end",
			);

			publishResearchStatus(threadId, { status: "complete", roundId });
			return { status: "complete", roundId } satisfies WorkflowOutput;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			await markRoundFailed({ id: roundId, error: msg });
			stepLog.error(
				{
					step: "synthesize",
					threadId,
					runId,
					roundId,
					durationMs: Date.now() - startedAt,
					err,
				},
				"step failed",
			);
			publishResearchStatus(threadId, { status: "failed", roundId });
			throw err;
		}
	},
});

// ---------- Workflow ----------

/**
 * Background research workflow.
 *
 * Shape: linear steps → parallel worker block → synthesize. The parallel
 * block is the latency win — three workers run concurrently as Inngest
 * steps instead of going through the old LLM-driven supervisor
 * delegation loop (which the model tended to serialize). The rag worker
 * typically finishes first (~6-9s: embed + pgvector + MMR + LLM) so it
 * adds no wall-clock time beyond the PubMed workers' ~10-15s budget.
 *
 * Wall-clock budget:
 *   loadContext + gateByHash + extractBrief + insertRunning  ~   0.5s
 *   .parallel([guideline, literature, rag])                  ~ 10-15s (max)
 *   synthesize                                               ~  8-12s
 *                                                   total    ~ 20-30s
 *
 * Flow control: the `gateByHash` step cheaply skips rounds whose chart
 * is unchanged since the last completed round, so rapid back-to-back
 * triggers are safe — they bail early without burning LLM calls.
 */
export const backgroundResearchWorkflow = createWorkflow({
	id: "backgroundResearch",
	inputSchema: workflowInputSchema,
	outputSchema: workflowOutputSchema,
})
	.then(loadContextStep)
	.then(gateByHashStep)
	.then(extractBriefStep)
	.then(insertRunningStep)
	.parallel([guidelineWorkerStep, literatureWorkerStep, ragWorkerStep])
	.then(synthesizeStep)
	.commit();
