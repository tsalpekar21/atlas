import { describe, expect, test } from "vitest";
import {
	CHART_WITHOUT_FOCUS_ITEMS,
	EMPTY_CHART,
	GOALS_CHART,
	TREATMENT_CHART,
	TRIAGE_CHART_WITH_HYPOTHESES,
	TRIAGE_CHART_WITH_RESEARCH_LOG,
} from "../test-helpers/charts.ts";
import {
	computeChartHash,
	extractBriefFromChart,
	parseChartSections,
} from "./research.ts";

/**
 * Unit tests for the pure chart parsing + brief extraction in
 * `services/research.ts`. Exercises the internal helpers
 * (parseHypotheses, parseConditions, parseHealthGoals, parseRedFlags,
 * parseActiveMode, parseOpenQuestions, parseSubsections, readField,
 * etc.) through the exported surface functions.
 */

// ---------- parseChartSections ----------

describe("parseChartSections", () => {
	test("splits markdown by `## H2` headings", () => {
		const md = `# Title

## Section A
body of A

## Section B
body of B
more of B`;
		const sections = parseChartSections(md);
		expect(sections.get("Section A")).toBe("body of A");
		expect(sections.get("Section B")).toContain("body of B");
		expect(sections.get("Section B")).toContain("more of B");
	});

	test("does not split on `### H3` headings", () => {
		const md = `## Outer
- key: value

### Inner subsection
inner body`;
		const sections = parseChartSections(md);
		// Inner lives under Outer; no separate section.
		expect(sections.has("Inner subsection")).toBe(false);
		expect(sections.get("Outer")).toContain("### Inner subsection");
		expect(sections.get("Outer")).toContain("inner body");
	});

	test("empty input produces empty map", () => {
		expect(parseChartSections("").size).toBe(0);
	});

	test("markdown with no ## sections produces empty map", () => {
		expect(parseChartSections("# Title only\nno h2 anywhere").size).toBe(0);
	});
});

// ---------- extractBriefFromChart — mode selection ----------

describe("extractBriefFromChart — triage mode", () => {
	test("promotes hypotheses as primary focus items", () => {
		const decision = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		expect(decision.shouldResearch).toBe(true);
		expect(decision.brief?.mode).toBe("triage");
		expect(decision.brief?.focusItems.length).toBeGreaterThanOrEqual(2);
		expect(decision.brief?.focusItems[0]?.kind).toBe("hypothesis");
	});

	test("sorts hypotheses by confidence descending", () => {
		const decision = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		const [first, second] = decision.brief?.focusItems ?? [];
		expect(first?.confidence).toBeGreaterThanOrEqual(second?.confidence ?? 0);
	});

	test("parses `Systems involved` into an array", () => {
		const decision = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		const sibo = decision.brief?.focusItems.find((f) =>
			f.label.toLowerCase().includes("sibo"),
		);
		expect(sibo?.systems).toContain("assimilation");
	});

	test("clamps confidence to [0, 1]", () => {
		const decision = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		for (const item of decision.brief?.focusItems ?? []) {
			expect(item.confidence).toBeGreaterThanOrEqual(0);
			expect(item.confidence).toBeLessThanOrEqual(1);
		}
	});

	test("picks up red flags and escalates riskLevel", () => {
		// TRIAGE_CHART_WITH_HYPOTHESES has a red flag with "soon" urgency.
		const decision = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		expect(decision.brief?.riskLevel).toBe("soon");
	});
});

describe("extractBriefFromChart — treatment mode", () => {
	test("promotes conditions as primary focus items", () => {
		const decision = extractBriefFromChart(TREATMENT_CHART);
		expect(decision.brief?.mode).toBe("treatment");
		expect(decision.brief?.focusItems[0]?.kind).toBe("condition");
	});

	test("folds condition details into notes", () => {
		const decision = extractBriefFromChart(TREATMENT_CHART);
		const hashimoto = decision.brief?.focusItems.find((f) =>
			f.label.toLowerCase().includes("hashimoto"),
		);
		expect(hashimoto?.notes.some((n) => n.startsWith("certainty:"))).toBe(true);
		expect(hashimoto?.notes.some((n) => n.startsWith("current:"))).toBe(true);
	});
});

describe("extractBriefFromChart — goals mode", () => {
	test("promotes health goals as primary focus items", () => {
		const decision = extractBriefFromChart(GOALS_CHART);
		expect(decision.brief?.mode).toBe("goals");
		expect(decision.brief?.focusItems[0]?.kind).toBe("goal");
	});

	test("includes target, timeline, baseline, constraints in notes", () => {
		const decision = extractBriefFromChart(GOALS_CHART);
		const sleepGoal = decision.brief?.focusItems.find((f) =>
			f.label.toLowerCase().includes("sleep"),
		);
		const joined = sleepGoal?.notes.join(" | ") ?? "";
		expect(joined).toMatch(/target:/);
		expect(joined).toMatch(/timeline:/);
		expect(joined).toMatch(/baseline:/);
	});
});

// ---------- extractBriefFromChart — skip paths ----------

describe("extractBriefFromChart — skip paths", () => {
	test("empty chart returns shouldResearch=false", () => {
		const decision = extractBriefFromChart(EMPTY_CHART);
		expect(decision.shouldResearch).toBe(false);
		expect(decision.brief).toBeNull();
		expect(decision.reason).toMatch(/no focus items/i);
	});

	test("chart with no focus items and no red flags skips", () => {
		const decision = extractBriefFromChart(CHART_WITHOUT_FOCUS_ITEMS);
		expect(decision.shouldResearch).toBe(false);
		expect(decision.reason).toMatch(/no focus items/i);
	});
});

// ---------- extractBriefFromChart — context rendering ----------

describe("extractBriefFromChart — context rendering", () => {
	test("prefixes context with [mode: X]", () => {
		const t = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		expect(t.brief?.context).toMatch(/^\[mode: triage\]/);
		const tx = extractBriefFromChart(TREATMENT_CHART);
		expect(tx.brief?.context).toMatch(/^\[mode: treatment\]/);
		const g = extractBriefFromChart(GOALS_CHART);
		expect(g.brief?.context).toMatch(/^\[mode: goals\]/);
	});

	test("includes a leading-focus summary", () => {
		const t = extractBriefFromChart(TRIAGE_CHART_WITH_HYPOTHESES);
		expect(t.brief?.context).toMatch(/Leading focus:/);
	});
});

// ---------- computeChartHash ----------

describe("computeChartHash", () => {
	test("identical input produces identical hash", () => {
		const h1 = computeChartHash(TRIAGE_CHART_WITH_HYPOTHESES);
		const h2 = computeChartHash(TRIAGE_CHART_WITH_HYPOTHESES);
		expect(h1).toBe(h2);
	});

	test("different chart content produces different hash", () => {
		const h1 = computeChartHash(TRIAGE_CHART_WITH_HYPOTHESES);
		const h2 = computeChartHash(TREATMENT_CHART);
		expect(h1).not.toBe(h2);
	});

	test("excludes Research Log section — appending log entries does NOT change hash", () => {
		const h1 = computeChartHash(TRIAGE_CHART_WITH_HYPOTHESES);
		const h2 = computeChartHash(TRIAGE_CHART_WITH_RESEARCH_LOG);
		expect(h1).toBe(h2);
	});

	test("detects hypothesis additions", () => {
		const base = TRIAGE_CHART_WITH_HYPOTHESES;
		const withNewHypothesis = `${base}\n### Hypothesis: New hypothesis label
- Systems involved: energy
- Confidence: 0.2`;
		expect(computeChartHash(base)).not.toBe(
			computeChartHash(withNewHypothesis),
		);
	});

	test("produces a stable sha256-style hex digest", () => {
		const h = computeChartHash(TRIAGE_CHART_WITH_HYPOTHESES);
		expect(h).toMatch(/^[a-f0-9]{64}$/);
	});
});
