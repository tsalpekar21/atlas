export const USER_PROFILE_TEMPLATE = `
# User Profile

## Demographics
- Age:
- Sex at birth:
- Gender:
- Location:
- Occupation:

## Active Mode
<!--
One of: triage | treatment | goals. Modes can blend — note which is primary
and which is secondary if both apply. Update as the conversation shifts.
- triage: user describes symptoms, unclear what's going on
- treatment: user has a diagnosis, exploring options
- goals: user pursuing a health outcome
-->
- Current:
- Notes:

## User Focus
<!--
Short free-form summary of what the user wants help with right now, in
their own words where possible. 1-3 sentences. Update when the focus
materially shifts.
-->

## Medical History
- Known diagnoses:
- Current medications:
- Current supplements:
- Surgeries:
- Allergies:
- Family history:
- Prior workup (labs, imaging):

## Current Baseline
<!-- Universal across modes — the user's lifestyle context. -->
- Sleep (hours, quality, latency, wakings):
- Nutrition (pattern, quality, restrictions, hydration):
- Movement (type, frequency, capacity):
- Stress (sources, coping, perceived load):
- Environment (mold, air, water, toxins):
- Substances (alcohol, caffeine, nicotine, recreational):

## Timeline
<!--
Key events relevant to what the user is working on. Each event:
date | category | description.
Categories: birth/early life, infection, injury/surgery, medication,
major stressor, environmental exposure, diet change, relationship event,
diagnosis, symptom onset, training block, goal milestone, other.
-->

## Red Flags Detected
<!-- Each: description | urgency (emergency, urgent, soon) | action advised -->

## Research Log
<!--
One line per research round you've applied.
Format: round_id | what_changed (short) | what you applied
-->

## Interview State
<!--
The live coverage dashboard. Every field below must be kept accurate
turn by turn. In triage mode, "Coverage" is the gate for moving to
synthesis — see the prompt's "Required coverage" section for what each
field must contain before you can wrap up. Mark each field as empty,
partial, or complete.
-->
- Active mode:
- Phase: rapport | history | timeline | systems_review | lifestyle | hypothesis_building | ready_for_synthesis
- Coverage:
  - Demographics:
  - Medical history:
    - Diagnoses:
    - Medications:
    - Supplements:
    - Surgeries:
    - Allergies:
    - Family history:
    - Prior workup:
  - Current baseline:
    - Sleep:
    - Nutrition:
    - Movement:
    - Stress:
    - Environment:
    - Substances:
  - Chief complaints OPQRST:
  - Timeline:
  - Systems review:
    - Assimilation:
    - Defense & Repair:
    - Energy:
    - Biotransformation & Elimination:
    - Transport:
    - Communication:
    - Structural Integrity:
  - ATM framework:
    - Antecedents:
    - Triggers:
    - Mediators:
  - Hypotheses (count + confidence):
- Biggest current gap:
- Readiness for synthesis (0.0-1.0):
- Open questions:

<!--
============================================================
MODE-SPECIFIC SECTIONS — add these when they become relevant
============================================================

Add sections BELOW this comment using the shapes shown. Do not pre-fill
empty scaffolding; add a section only when you have content for it.

## Presenting Concerns / Symptoms  [triage mode]
### Symptom: [name]
- Onset:
- Duration:
- Frequency:
- Severity (0-10):
- Quality:
- Location:
- Radiation:
- Triggers:
- Relievers:
- Associated symptoms:
- Pattern:
- Impact on life:

## Systems Review (IFM 7 Systems)  [triage mode]
### Assimilation (digestion, absorption, microbiome, permeability)
- Notes:
- Symptoms:
### Defense & Repair (immune, inflammation, infection)
- Notes:
- Symptoms:
### Energy (mitochondrial, metabolic)
- Notes:
- Symptoms:
### Biotransformation & Elimination (liver, kidneys, bowel, lymph, skin)
- Notes:
- Symptoms:
### Transport (cardiovascular, lymphatic)
- Notes:
- Symptoms:
### Communication (hormones, neurotransmitters, cytokines)
- Notes:
- Symptoms:
### Structural Integrity (cellular to musculoskeletal)
- Notes:
- Symptoms:

## ATM Framework  [triage mode]
- Antecedents (predispositions):
- Triggers (what started it):
- Mediators (what sustains it):

## Hypotheses  [triage mode]
### Hypothesis: [short label]
- Systems involved:
- Supporting evidence:
- Contradicting evidence:
- Confidence (0.0-1.0):
- Next discriminating questions:

## Conditions Being Explored  [treatment mode]
### Condition: [name]
- Diagnostic certainty:
- Stage / severity:
- Diagnosed by:
- Date diagnosed:
- Current treatments:
- Prior treatments tried:
- User priorities (efficacy, side effects, cost, lifestyle):

## Treatment Options  [treatment mode]
### Option: [name]
- Evidence summary:
- Pros:
- Cons:
- Open questions for clinician:

## Health Goals  [goals mode]
### Goal: [short label]
- Target:
- Timeline:
- Why this goal:
- Baseline (current state):
- Constraints:
- Prior attempts:
- Active experiments:
- Tracking (how to measure):
-->
`.trim();
