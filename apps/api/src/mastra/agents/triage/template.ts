export const PATIENT_CHART_TEMPLATE = `
# Patient Chart

## Demographics
- Age:
- Sex at birth:
- Gender:
- Location:
- Occupation:

## Chief Complaints
<!-- For each symptom, copy this block and fill in. Use patient's own words for the name. -->
### Symptom: [name]
- Onset:
- Duration:
- Frequency: (constant, daily, weekly, episodic)
- Severity (0-10):
- Quality: (sharp, dull, burning, aching, throbbing, etc.)
- Location:
- Radiation:
- Triggers:
- Relievers:
- Associated symptoms:
- Pattern: (diurnal, postprandial, cyclical, etc.)
- Impact on life:

## Timeline
<!-- Each event on its own line: approximate date | category | description | relevance -->
<!-- Categories: birth/early life, infection, injury/surgery, medication, major stressor, environmental exposure, diet change, relationship event, diagnosis, symptom onset, other -->

## Systems Review (IFM 7 Systems)

### Assimilation (digestion, absorption, microbiome, permeability)
- Notes:
- Symptoms:
- Red flags:

### Defense & Repair (immune, inflammation, infection)
- Notes:
- Symptoms:
- Red flags:

### Energy (mitochondrial, metabolic)
- Notes:
- Symptoms:
- Red flags:

### Biotransformation & Elimination (liver detox, kidneys, bowel, lymph, skin)
- Notes:
- Symptoms:
- Red flags:

### Transport (cardiovascular, lymphatic)
- Notes:
- Symptoms:
- Red flags:

### Communication (hormones, neurotransmitters, cytokines)
- Notes:
- Symptoms:
- Red flags:

### Structural Integrity (cellular to musculoskeletal)
- Notes:
- Symptoms:
- Red flags:

## Modifiable Factors
- Sleep: (hours, quality, latency, wakings)
- Nutrition: (pattern, quality, restrictions, hydration)
- Movement: (type, frequency, capacity)
- Stress: (sources, coping, perceived load)
- Relationships:
- Environment: (mold, air, water, toxins)
- Substances: (alcohol, caffeine, nicotine, recreational)

## Medical History
- Diagnoses:
- Surgeries:
- Medications:
- Supplements:
- Allergies:
- Family history:
- Prior workup: (labs, imaging)

## Patient Goals
-

## ATM Framework
- Antecedents (predispositions):
- Triggers (what started it):
- Mediators (what sustains it):

## Hypotheses
<!-- For each hypothesis, copy this block and fill in -->
### Hypothesis: [short label, e.g. "HPA-axis dysregulation"]
- Systems involved:
- Supporting evidence:
- Contradicting evidence:
- Confidence (0.0-1.0):
- Next discriminating questions:

## Red Flags Detected
<!-- Each flag: description | urgency (emergency, urgent, soon) | action advised -->

## Interview State
- Phase: rapport
- Coverage:
  - Chief complaint: 0.0
  - Timeline: 0.0
  - Systems review: 0.0
  - Lifestyle: 0.0
  - History: 0.0
- Readiness to match (0.0-1.0): 0.0
- Open questions:
`.trim();
