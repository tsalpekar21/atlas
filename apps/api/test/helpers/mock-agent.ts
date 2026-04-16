import type { Mastra } from "@mastra/core/mastra";
import { vi } from "vitest";

/**
 * Test helpers for replacing Mastra agents' `generate()` methods with
 * deterministic canned outputs. Used across integration tests that
 * exercise the research workflow end-to-end against real pgvector +
 * DB but want to avoid real LLM calls.
 *
 * Approach: spy on `mastra.getAgent(id).generate` and point it at a
 * mock that returns a minimal AI-SDK-shaped result. The AI SDK's
 * `GenerateTextResult` has ~20 fields; we only populate the few the
 * workflow code actually reads (`text`, `steps`, optionally
 * `toolResults`). An `as never` cast keeps us from re-implementing
 * the full shape — test-only, safe.
 */

type CannedToolResult = {
	toolName: string;
	output: unknown;
};

/**
 * Build a minimal AI-SDK `GenerateTextResult`-shaped object. Includes
 * only the fields the workflow reads:
 *  - `text`: the worker's emitted response
 *  - `steps[0].toolResults[]`: picked up by `extractRetrievedChunkIds`
 *    when the rag worker calls the ragSearch tool
 *
 * Everything else is `undefined` / empty and cast to `never` at the
 * boundary so TypeScript doesn't force us to hand-construct a full
 * LanguageModelUsage / FinishReason / etc.
 */
function buildMockGenerateResult(
	text: string,
	toolResults: CannedToolResult[] = [],
): unknown {
	return {
		text,
		steps: [
			{
				toolResults: toolResults.map((tr) => ({
					toolName: tr.toolName,
					output: tr.output,
				})),
			},
		],
		toolCalls: [],
		toolResults: [],
		finishReason: "stop",
		usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
	};
}

/**
 * Swap the `generate()` method on a single agent so it returns a
 * canned response. Safe to call in a `beforeEach` / `beforeAll` — the
 * underlying `vi.spyOn` handle is captured and automatically restored
 * when `vi.restoreAllMocks()` runs. Returns the spy so callers can
 * inspect how many times it was called / with what args.
 *
 * Example:
 * ```ts
 * mockAgentGenerate(mastra, "guidelineResearcher", () => ({
 *   text: "EVIDENCE ITEMS:\n- claim: ...\n",
 * }));
 * ```
 */
export function mockAgentGenerate(
	mastra: Mastra,
	agentId: string,
	respond: (prompt: unknown) => {
		text: string;
		toolResults?: CannedToolResult[];
	},
) {
	const agent = mastra.getAgent(agentId);
	const spy = vi
		.spyOn(agent, "generate")
		.mockImplementation(async (prompt: unknown) => {
			const { text, toolResults } = respond(prompt);
			return buildMockGenerateResult(text, toolResults) as never;
		});
	return spy;
}

/**
 * Convenience: canned evidence-items text in the format the
 * synthesizer expects each worker to emit. Pass the focus-item labels
 * and optional chunk ids (for the rag worker) to get a parseable
 * response back.
 */
export function cannedEvidenceItems(options: {
	sourceQuality: "gold" | "guideline" | "peer-reviewed" | "functional-medicine-corpus";
	labels: string[];
	chunkIds?: string[];
	pageTitle?: string;
}): string {
	const { sourceQuality, labels, chunkIds, pageTitle } = options;
	const items = labels.map((label, i) => {
		const chunkId = chunkIds?.[i];
		const source =
			sourceQuality === "functional-medicine-corpus" && chunkId
				? `Rupa Health | ${pageTitle ?? "Test Page"} | chunkId=${chunkId}`
				: "PMID 12345678 | Test Journal | 2024";
		return `- claim: Evidence bearing on ${label}
  source: ${source}
  sourceQuality: ${sourceQuality}
  relationship: supports
  hypothesis: ${label}
  facts:
    - fact 1 about ${label}
    - fact 2 about ${label}
  confidence: 0.7`;
	});
	return `EVIDENCE ITEMS:\n${items.join("\n\n")}\n\nOPEN QUESTIONS:\n- followup question`;
}

/**
 * Canned JSON synthesis that the synthesizer agent might emit. Gives
 * us a valid `ResearchSynthesis` shape with evidence items that
 * exercise the `computeRagMetrics` adoption-rate computation.
 */
export function cannedSynthesisJson(options: {
	focusLabel: string;
	corpusChunkIds: string[];
	corpusPageTitle?: string;
}): string {
	const { focusLabel, corpusChunkIds, corpusPageTitle } = options;
	const corpusItems = corpusChunkIds.map((chunkId) => ({
		claim: `Corpus evidence about ${focusLabel}`,
		source: `Rupa Health | ${corpusPageTitle ?? "Test Page"} | chunkId=${chunkId}`,
		sourceQuality: "functional-medicine-corpus",
		relationship: "supports",
		hypothesis: focusLabel,
		facts: ["corpus fact 1", "corpus fact 2"],
		confidence: 0.7,
	}));
	return JSON.stringify(
		{
			updatedRankings: [
				{
					label: focusLabel,
					previousConfidence: 0.5,
					newConfidence: 0.7,
					reason: "corroborated by corpus evidence",
				},
			],
			evidenceItems: [
				{
					claim: `PubMed evidence for ${focusLabel}`,
					source: "PMID 11111111 | Guideline Journal | 2023",
					sourceQuality: "guideline",
					relationship: "supports",
					hypothesis: focusLabel,
					facts: ["guideline fact"],
					confidence: 0.9,
				},
				...corpusItems,
			],
			suggestedQuestions: ["next question?"],
			escalationFlags: [],
			openQuestions: ["unresolved angle"],
			whatChanged: "Corpus and PubMed both corroborated the leading hypothesis.",
		},
		null,
		2,
	);
}
