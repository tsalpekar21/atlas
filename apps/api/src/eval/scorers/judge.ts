export const JUDGE_MODEL = "google/gemini-3-flash-preview" as const;

export function positionAssignment(caseId: string): {
	aIsTreatment: boolean;
	labelA: "treatment" | "control";
	labelB: "treatment" | "control";
} {
	let hash = 0;
	for (let i = 0; i < caseId.length; i++) {
		hash = (hash * 31 + caseId.charCodeAt(i)) | 0;
	}
	const aIsTreatment = (hash & 1) === 0;
	return {
		aIsTreatment,
		labelA: aIsTreatment ? "treatment" : "control",
		labelB: aIsTreatment ? "control" : "treatment",
	};
}

export function winnerToScore(
	winner: "A" | "B" | "tie",
	aIsTreatment: boolean,
): number {
	if (winner === "tie") return 0.5;
	const treatmentWon =
		(winner === "A" && aIsTreatment) || (winner === "B" && !aIsTreatment);
	return treatmentWon ? 1 : 0;
}
