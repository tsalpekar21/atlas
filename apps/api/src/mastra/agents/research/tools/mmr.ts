/**
 * Pure retrieval-reranking primitives used by the `ragSearch` tool and
 * — eventually — any other tool that wants to diversify a candidate
 * pool. Kept intentionally generic so they can be unit-tested without
 * the real embedding pipeline or vector store.
 *
 * The MMR candidate shape is a minimal structural contract: anything
 * that carries a `score` and a `vector` works. Caller-specific payload
 * fields (chunkId, content, etc.) are preserved through the generic
 * type parameter.
 */

/**
 * Structural contract MMR needs. Callers may pass any object whose type
 * extends this — the extra fields are carried through unchanged.
 */
export type MmrCandidate = {
	score: number;
	vector: number[];
};

/**
 * Cosine similarity of two equal-length vectors. Returns 0 (not NaN) on
 * zero-magnitude inputs so MMR never divides by zero. Truncates to the
 * shorter vector when lengths disagree — defensive against callers
 * passing in a short representative vector alongside full embeddings.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) {
		const ai = a[i] ?? 0;
		const bi = b[i] ?? 0;
		dot += ai * bi;
		na += ai * ai;
		nb += bi * bi;
	}
	if (na === 0 || nb === 0) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Greedy Maximal Marginal Relevance selection. At each step picks the
 * candidate maximizing
 *   λ * relevance - (1-λ) * max_sim(candidate, already_selected)
 * where `relevance` is the candidate's pre-computed similarity-to-query
 * score and pairwise similarity is cosine over the candidate vectors.
 *
 * - `λ = 1` reduces to pure top-K by score.
 * - `λ = 0` reduces to pure diversity (after the initial top-score
 *   seed).
 * - `λ = 0.7` (the tool's default) biases toward relevance while still
 *   discouraging near-duplicates.
 *
 * If `candidates.length <= k`, returns the input unchanged. O(k * n)
 * in the worst case — fine for n ≤ ~100, which is our budget.
 */
export function selectWithMmr<T extends MmrCandidate>(
	candidates: T[],
	k: number,
	lambda: number,
): T[] {
	if (candidates.length <= k) return candidates;
	const remaining = [...candidates].sort((a, b) => b.score - a.score);
	const selected: T[] = [];
	const first = remaining.shift();
	if (!first) return selected;
	selected.push(first);

	while (selected.length < k && remaining.length > 0) {
		let bestIdx = 0;
		let bestMmr = -Infinity;
		for (let i = 0; i < remaining.length; i++) {
			const c = remaining[i];
			if (!c) continue;
			let maxSim = 0;
			for (const s of selected) {
				const sim = cosineSimilarity(c.vector, s.vector);
				if (sim > maxSim) maxSim = sim;
			}
			const mmr = lambda * c.score - (1 - lambda) * maxSim;
			if (mmr > bestMmr) {
				bestMmr = mmr;
				bestIdx = i;
			}
		}
		const picked = remaining.splice(bestIdx, 1)[0];
		if (picked) selected.push(picked);
	}
	return selected;
}
