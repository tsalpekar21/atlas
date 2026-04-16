import { evidenceGroundednessScorer } from "./pairwise/evidence-groundedness.ts";
import { factualCorrectnessScorer } from "./pairwise/factual-correctness.ts";
import { finalSummaryQualityScorer } from "./pairwise/final-summary-quality.ts";
import { questionQualityScorer } from "./pairwise/question-quality.ts";
import { specificityScorer } from "./pairwise/specificity.ts";
import { mustCoverCoverageScorer } from "./reference/must-cover-coverage.ts";
import { redFlagRecallScorer } from "./reference/red-flag-recall.ts";

export const abCompareScorers = [
	questionQualityScorer,
	finalSummaryQualityScorer,
	evidenceGroundednessScorer,
	specificityScorer,
	factualCorrectnessScorer,
	redFlagRecallScorer,
	mustCoverCoverageScorer,
];

export {
	evidenceGroundednessScorer,
	factualCorrectnessScorer,
	finalSummaryQualityScorer,
	mustCoverCoverageScorer,
	questionQualityScorer,
	redFlagRecallScorer,
	specificityScorer,
};
