import { describe, expect, test } from "vitest";
import type {
	PlannerBrief,
	ResearchSynthesis,
} from "../../../services/research.ts";
import {
	buildWorkerPrompt,
	computeRagMetrics,
	extractRetrievedChunkIds,
	parseSynthesisJson,
} from "./helpers.ts";

/**
 * Unit tests for the pure helpers used by `backgroundResearchWorkflow`.
 * These are the functions that used to live inside the workflow file
 * — extracting them let us exercise the edge cases without the Mastra
 * runtime.
 */

// ---------- parseSynthesisJson ----------

describe("parseSynthesisJson", () => {
	test("parses clean JSON and attaches rawText", () => {
		const raw = JSON.stringify({
			evidenceItems: [{ claim: "x" }],
			whatChanged: "ok",
		});
		const out = parseSynthesisJson(raw);
		expect(out.evidenceItems).toEqual([{ claim: "x" }]);
		expect(out.whatChanged).toBe("ok");
		expect(out.rawText).toBe(raw);
	});

	test("strips ```json markdown fences", () => {
		const raw =
			"```json\n" + JSON.stringify({ whatChanged: "fenced" }) + "\n```";
		const out = parseSynthesisJson(raw);
		expect(out.whatChanged).toBe("fenced");
		expect(out.rawText).toBe(raw);
	});

	test("strips bare ``` fences (no language tag)", () => {
		const raw = "```\n" + JSON.stringify({ whatChanged: "bare" }) + "\n```";
		const out = parseSynthesisJson(raw);
		expect(out.whatChanged).toBe("bare");
	});

	test("recovers JSON from surrounding prose via regex", () => {
		const raw = `Sure! Here's the synthesis:\n\n${JSON.stringify({
			whatChanged: "recovered",
		})}\n\nLet me know if you'd like changes.`;
		const out = parseSynthesisJson(raw);
		expect(out.whatChanged).toBe("recovered");
	});

	test("falls back to minimal synthesis on unparseable input", () => {
		const raw = "this is not JSON at all, just prose";
		const out = parseSynthesisJson(raw);
		expect(out.evidenceItems).toEqual([]);
		expect(out.suggestedQuestions).toEqual([]);
		expect(out.escalationFlags).toEqual([]);
		expect(out.openQuestions).toEqual([]);
		expect(out.whatChanged).toContain("unparseable");
		expect(out.rawText).toBe(raw);
	});

	test("falls back when stripped content is syntactically invalid", () => {
		const raw = "```json\n{ not valid json,, }\n```";
		const out = parseSynthesisJson(raw);
		expect(out.whatChanged).toContain("unparseable");
	});
});

// ---------- buildWorkerPrompt ----------

describe("buildWorkerPrompt", () => {
	const brief: PlannerBrief = {
		mode: "triage",
		context: "[mode: triage] 34yo female. postprandial bloating.",
		focusItems: [
			{
				label: "SIBO",
				kind: "hypothesis",
				systems: ["assimilation"],
				confidence: 0.55,
				notes: ["postprandial bloating"],
			},
		],
		unknowns: ["stool history"],
		researchQuestions: ["prior antibiotic exposure?"],
		riskLevel: "routine",
	};

	test("emits a prompt that contains the Brief: marker", () => {
		expect(buildWorkerPrompt(brief)).toContain("Brief:");
	});

	test("serializes the brief as pretty-printed JSON", () => {
		const prompt = buildWorkerPrompt(brief);
		expect(prompt).toContain('"mode": "triage"');
		expect(prompt).toContain('"SIBO"');
		expect(prompt).toContain('"riskLevel": "routine"');
	});

	test("is deterministic for the same brief", () => {
		expect(buildWorkerPrompt(brief)).toBe(buildWorkerPrompt(brief));
	});
});

// ---------- extractRetrievedChunkIds ----------

describe("extractRetrievedChunkIds", () => {
	test("walks steps[].toolResults and unions chunkIds", () => {
		const steps = [
			{
				toolResults: [
					{
						toolName: "ragSearch",
						output: { results: [{ chunkId: "a" }, { chunkId: "b" }] },
					},
				],
			},
			{
				toolResults: [
					{
						toolName: "ragSearch",
						output: { results: [{ chunkId: "c" }] },
					},
				],
			},
		];
		expect(extractRetrievedChunkIds(steps).sort()).toEqual(["a", "b", "c"]);
	});

	test("deduplicates chunkIds across steps", () => {
		const steps = [
			{
				toolResults: [
					{
						toolName: "ragSearch",
						output: { results: [{ chunkId: "a" }, { chunkId: "b" }] },
					},
				],
			},
			{
				toolResults: [
					{
						toolName: "ragSearch",
						output: { results: [{ chunkId: "b" }, { chunkId: "c" }] },
					},
				],
			},
		];
		expect(extractRetrievedChunkIds(steps).sort()).toEqual(["a", "b", "c"]);
	});

	test("reads legacy `result` shape as well as `output`", () => {
		const steps = [
			{
				toolResults: [
					{
						toolName: "ragSearch",
						result: { results: [{ chunkId: "from-result" }] },
					},
				],
			},
		];
		expect(extractRetrievedChunkIds(steps)).toEqual(["from-result"]);
	});

	test("filters out non-ragSearch tool calls", () => {
		const steps = [
			{
				toolResults: [
					{
						toolName: "pubmedSearch",
						output: { results: [{ chunkId: "should-be-ignored" }] },
					},
					{
						toolName: "ragSearch",
						output: { results: [{ chunkId: "kept" }] },
					},
				],
			},
		];
		expect(extractRetrievedChunkIds(steps)).toEqual(["kept"]);
	});

	test("handles missing/malformed input defensively", () => {
		expect(extractRetrievedChunkIds(undefined)).toEqual([]);
		expect(extractRetrievedChunkIds(null)).toEqual([]);
		expect(extractRetrievedChunkIds("not an array")).toEqual([]);
		expect(
			extractRetrievedChunkIds([
				{
					/* no toolResults */
				},
			]),
		).toEqual([]);
		expect(extractRetrievedChunkIds([{ toolResults: "not an array" }])).toEqual(
			[],
		);
		expect(
			extractRetrievedChunkIds([
				{ toolResults: [{ toolName: "ragSearch", output: null }] },
			]),
		).toEqual([]);
	});

	test("ignores non-string or empty chunkIds", () => {
		const steps = [
			{
				toolResults: [
					{
						toolName: "ragSearch",
						output: {
							results: [
								{ chunkId: "" },
								{ chunkId: 42 },
								{ chunkId: null },
								{ chunkId: "valid" },
							],
						},
					},
				],
			},
		];
		expect(extractRetrievedChunkIds(steps)).toEqual(["valid"]);
	});
});

// ---------- computeRagMetrics ----------

describe("computeRagMetrics", () => {
	const cite = (chunkId: string, page = "Test Page") => ({
		claim: "stuff",
		source: `Rupa Health | ${page} | chunkId=${chunkId}`,
		sourceQuality: "functional-medicine-corpus" as const,
		relationship: "supports",
		hypothesis: "x",
		facts: [],
		confidence: 0.7,
	});

	test("counts adoption correctly", () => {
		const retrieved = ["a", "b", "c", "d"];
		const evidenceItems: ResearchSynthesis["evidenceItems"] = [
			cite("a"),
			cite("c"),
		];
		const metrics = computeRagMetrics(retrieved, evidenceItems);
		expect(metrics).toEqual({
			retrieved: 4,
			cited: 2,
			adoptionRate: 0.5,
			uniquePagesCited: 1,
		});
	});

	test("counts distinct pages cited", () => {
		const retrieved = ["a", "b", "c"];
		const evidenceItems = [
			cite("a", "Page One"),
			cite("b", "Page One"),
			cite("c", "Page Two"),
		];
		const metrics = computeRagMetrics(retrieved, evidenceItems);
		expect(metrics?.uniquePagesCited).toBe(2);
	});

	test("returns undefined when no chunks were retrieved", () => {
		expect(computeRagMetrics([], [cite("a")])).toBeUndefined();
		expect(computeRagMetrics(undefined, [cite("a")])).toBeUndefined();
	});

	test("zero-adoption: retrieved with no corpus evidence", () => {
		const retrieved = ["a", "b", "c"];
		const metrics = computeRagMetrics(retrieved, []);
		expect(metrics).toEqual({
			retrieved: 3,
			cited: 0,
			adoptionRate: 0,
			uniquePagesCited: 0,
		});
	});

	test("ignores non-corpus evidence items", () => {
		const retrieved = ["a"];
		const evidenceItems: ResearchSynthesis["evidenceItems"] = [
			{
				claim: "pubmed",
				source: "PMID 12345 | Journal | 2024 | chunkId=a",
				sourceQuality: "guideline",
				relationship: "supports",
				hypothesis: "x",
				facts: [],
				confidence: 0.9,
			},
		];
		const metrics = computeRagMetrics(retrieved, evidenceItems);
		expect(metrics?.cited).toBe(0);
	});

	test("evidenceItems undefined is treated as empty", () => {
		const metrics = computeRagMetrics(["a"], undefined);
		expect(metrics).toEqual({
			retrieved: 1,
			cited: 0,
			adoptionRate: 0,
			uniquePagesCited: 0,
		});
	});
});
