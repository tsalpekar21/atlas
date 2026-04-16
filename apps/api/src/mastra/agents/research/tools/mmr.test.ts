import { describe, expect, test } from "vitest";
import { cosineSimilarity, type MmrCandidate, selectWithMmr } from "./mmr.ts";

/**
 * Unit tests for the MMR primitives. Pure math / greedy selection —
 * no mocks, no state. Runs under `pnpm test` via the src/**\/*.test.ts
 * vitest glob.
 */

describe("cosineSimilarity", () => {
	test("identical vectors produce 1.0", () => {
		const v = [1, 0, 0, 1];
		expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
	});

	test("orthogonal vectors produce 0", () => {
		expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
	});

	test("opposite vectors produce -1", () => {
		expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 10);
	});

	test("empty vector returns 0 (not NaN)", () => {
		expect(cosineSimilarity([], [])).toBe(0);
		expect(Number.isNaN(cosineSimilarity([], []))).toBe(false);
	});

	test("zero vector returns 0 (not NaN)", () => {
		expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
	});

	test("unequal-length vectors truncate to the shorter, no throw", () => {
		// Both effectively [1, 0] — should be identical after truncation.
		expect(cosineSimilarity([1, 0], [1, 0, 99, 99])).toBeCloseTo(1.0, 10);
	});

	test("returns value in [-1, 1]", () => {
		const a = [0.3, 0.7, 0.1, 0.9];
		const b = [0.8, 0.2, 0.5, 0.4];
		const result = cosineSimilarity(a, b);
		expect(result).toBeGreaterThanOrEqual(-1);
		expect(result).toBeLessThanOrEqual(1);
	});
});

describe("selectWithMmr", () => {
	function makeCandidate(
		id: string,
		score: number,
		vector: number[],
	): MmrCandidate & { id: string } {
		return { id, score, vector };
	}

	test("returns input unchanged when k >= candidates.length", () => {
		const cs = [
			makeCandidate("a", 0.9, [1, 0]),
			makeCandidate("b", 0.8, [0, 1]),
		];
		expect(selectWithMmr(cs, 5, 0.7)).toEqual(cs);
		expect(selectWithMmr(cs, 2, 0.7)).toEqual(cs);
	});

	test("returns empty when input is empty", () => {
		expect(selectWithMmr([] as MmrCandidate[], 5, 0.7)).toEqual([]);
	});

	test("λ=1 reduces to pure top-K by score", () => {
		// 4 candidates with 4 distinct scores, all on orthogonal axes
		// so the diversity term contributes nothing at λ=1.
		const cs = [
			makeCandidate("low", 0.3, [1, 0, 0, 0]),
			makeCandidate("mid", 0.6, [0, 1, 0, 0]),
			makeCandidate("high", 0.9, [0, 0, 1, 0]),
			makeCandidate("second", 0.8, [0, 0, 0, 1]),
		];
		const picked = selectWithMmr(cs, 2, 1.0).map(
			(c) => (c as { id: string }).id,
		);
		expect(picked).toEqual(["high", "second"]);
	});

	test("seeds with the highest-scoring candidate regardless of λ", () => {
		const cs = [
			makeCandidate("highest", 0.95, [1, 0, 0]),
			makeCandidate("mid1", 0.6, [0, 1, 0]),
			makeCandidate("mid2", 0.55, [0, 0, 1]),
		];
		for (const lambda of [0.0, 0.3, 0.7, 1.0]) {
			const picked = selectWithMmr(cs, 2, lambda);
			expect((picked[0] as { id: string }).id).toBe("highest");
		}
	});

	test("λ<1 prefers diversity over marginal score gain", () => {
		// Candidate "b" is a near-duplicate of "a" but slightly lower
		// score. Candidate "c" is orthogonal and much lower score. At
		// λ=0.3 (heavy diversity weighting) the second pick should be
		// "c" — the diverse option — not "b".
		const cs = [
			makeCandidate("a", 0.9, [1, 0, 0]),
			makeCandidate("b", 0.85, [0.99, 0.14, 0]), // ~0.99 similarity to a
			makeCandidate("c", 0.5, [0, 0, 1]), // orthogonal to a
		];
		const picked = selectWithMmr(cs, 2, 0.3).map(
			(x) => (x as { id: string }).id,
		);
		expect(picked).toEqual(["a", "c"]);
	});

	test("preserves caller's extra payload fields (generic type)", () => {
		// Verifies the `<T extends MmrCandidate>` generic threads caller
		// fields through.
		type WithPayload = MmrCandidate & { id: string; note: string };
		const cs: WithPayload[] = [
			{ id: "a", note: "first", score: 0.9, vector: [1, 0] },
			{ id: "b", note: "second", score: 0.5, vector: [0, 1] },
			{ id: "c", note: "third", score: 0.3, vector: [1, 1] },
		];
		const picked = selectWithMmr(cs, 2, 0.7);
		expect(picked[0]?.note).toBe("first");
		expect(picked[1]?.note).toBeDefined();
	});
});
