/**
 * Realistic working-memory chart fixtures for unit + integration tests.
 * Formatted to match the `USER_PROFILE_TEMPLATE` the health assistant
 * emits (see apps/api/src/mastra/agents/health-assistant/template.ts),
 * so `extractBriefFromChart`, `computeChartHash`, and the workflow
 * steps exercise their real parsing paths — not synthetic shortcuts.
 *
 * Each fixture is pinned to produce a specific set of focus items /
 * red flags so tests can assert against them precisely.
 */

/** Triage mode with 2 hypotheses, 1 red flag. */
export const TRIAGE_CHART_WITH_HYPOTHESES = `# User Profile

## Demographics
- Age: 34
- Sex at birth: female
- Occupation: software engineer

## Active Mode
- Current: triage
- Notes: fresh symptom intake

## User Focus
I've had persistent bloating and fatigue for about 6 weeks and want to figure out what's going on.

## Medical History
- Diagnoses: none significant
- Medications: none
- Supplements: multivitamin daily

## Current Baseline
- Sleep: 7h average, non-restorative
- Nutrition: mostly whole foods, some gluten

## Red Flags Detected
- unintentional 10lb weight loss over 4 weeks | soon | recommend labs within 2 weeks

## Hypotheses
### Hypothesis: Small intestinal bacterial overgrowth (SIBO)
- Systems involved: assimilation, defense & repair
- Supporting evidence: postprandial bloating, brain fog, 6-week timeline
- Contradicting evidence: no recent antibiotics
- Confidence: 0.55
- Next discriminating questions: history of food poisoning, stool pattern

### Hypothesis: Histamine intolerance
- Systems involved: defense & repair, biotransformation
- Supporting evidence: symptom flares with fermented foods, aged cheese
- Contradicting evidence: no skin flushing reported
- Confidence: 0.35
- Next discriminating questions: DAO enzyme history, menstrual cycle correlation

## Interview State
- Active mode: triage
- Phase: synthesis-ready
- Biggest gap: stool testing history
- Readiness for synthesis: 0.8
- Open questions: DAO enzyme history, stool testing history
`;

/** Treatment mode with 2 conditions. */
export const TREATMENT_CHART = `# User Profile

## Demographics
- Age: 52
- Sex at birth: male
- Occupation: accountant

## Active Mode
- Current: treatment
- Notes: exploring options for known diagnosis

## User Focus
I was diagnosed with hypothyroidism 2 years ago and want to compare treatment approaches.

## Medical History
- Diagnoses: Hashimoto's thyroiditis
- Medications: levothyroxine 75mcg daily

## Conditions Being Explored
### Condition: Hashimoto's thyroiditis
- Diagnostic certainty: 0.95
- Stage / severity: mild-moderate
- Current treatments: levothyroxine 75mcg
- Prior treatments tried: none
- User priorities: efficacy, low side effects

### Condition: Secondary iron deficiency
- Diagnostic certainty: 0.7
- Stage: mild
- Current treatments: none
- User priorities: lifestyle interventions first

## Interview State
- Active mode: treatment
- Phase: synthesis-ready
- Readiness for synthesis: 0.75
- Open questions: T3 vs T4 conversion markers
`;

/** Goals mode with 2 health goals. */
export const GOALS_CHART = `# User Profile

## Demographics
- Age: 28
- Sex at birth: female

## Active Mode
- Current: goals
- Notes: optimizing baseline health

## User Focus
I want to improve my sleep quality and run a half marathon in 6 months.

## Health Goals
### Goal: improve sleep quality
- Target: consistent 7.5h with restorative REM and deep sleep
- Timeline: 3 months
- Why this goal: chronic fatigue is affecting work and mood
- Baseline: 6h average, wakes twice per night
- Constraints: partner's schedule, shift work

### Goal: complete half marathon
- Target: 2h finish time
- Timeline: 6 months
- Baseline: currently runs 5k comfortably
- Prior attempts: couch-to-5k completed last year

## Interview State
- Active mode: goals
- Phase: synthesis-ready
- Readiness for synthesis: 0.7
- Open questions: current training plan, injury history
`;

/** Empty chart — triggers the loadContextStep bail path. */
export const EMPTY_CHART = "";

/**
 * Chart with only demographics — no focus items in any mode, no red
 * flags. Triggers the extractBriefStep bail path.
 */
export const CHART_WITHOUT_FOCUS_ITEMS = `# User Profile

## Demographics
- Age: 40
- Sex at birth: male

## Active Mode
- Current: triage

## User Focus
I'm just here to see what you can do.
`;

/**
 * Variant of TRIAGE_CHART_WITH_HYPOTHESES with a Research Log section
 * appended. Used to verify `computeChartHash` correctly excludes the
 * Research Log from the hash (the log is written by the workflow
 * itself, so including it would create a re-trigger loop).
 */
export const TRIAGE_CHART_WITH_RESEARCH_LOG = `${TRIAGE_CHART_WITH_HYPOTHESES}
## Research Log
- round-abc123 | confirmed SIBO hypothesis | applied evidence item about MMC dysfunction
`;
