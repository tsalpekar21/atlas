import {
	TREATMENT_CHART,
	TRIAGE_CHART_WITH_HYPOTHESES,
} from "../../test-helpers/charts.ts";
import type { CaseGold, CaseInput } from "../types.ts";

const ENDOMETRIOSIS_CHART = `# User Profile

## Demographics
- Age: 29
- Sex at birth: female
- Occupation: UX designer, mostly seated work

## Active Mode
- Current: triage
- Notes: investigating worsening cyclical pelvic pain

## User Focus
My periods have always been painful but the last year or two it's gotten noticeably worse. I'm trying to figure out whether something's actually wrong.

## Medical History
- Diagnoses: none significant
- Medications: ibuprofen during periods
- Gynecologic history: menarche at 12, cycles 28-32 days, heavy flow last 12 months

## Current Baseline
- Sleep: 6.5h, poor around period
- Activity: sedentary desk job, gentle yoga
- Nutrition: mostly whole foods

## Red Flags Detected
- pelvic pain severe enough to miss 2-3 workdays per cycle | soon | structured gynecologic workup

## Hypotheses
### Hypothesis: Endometriosis
- Systems involved: defense & repair, structural
- Supporting evidence: severe dysmenorrhea worsening over years, heavy flow, cyclical pattern
- Contradicting evidence: no imaging findings yet
- Confidence: 0.55
- Next discriminating questions: dyspareunia, cyclical bowel/bladder symptoms, fertility history

### Hypothesis: Adenomyosis
- Systems involved: structural, transport
- Supporting evidence: heavy flow, cyclical pain
- Contradicting evidence: typically more common post-pregnancy; patient is nulliparous
- Confidence: 0.3
- Next discriminating questions: uterine size on exam, character of pain (dull cramping vs sharp stabbing)

### Hypothesis: Primary dysmenorrhea
- Systems involved: defense & repair
- Supporting evidence: menarchal onset, partial NSAID response
- Contradicting evidence: progressive worsening rather than stable, significant life impact
- Confidence: 0.2
- Next discriminating questions: NSAID timing response, pattern of any non-cyclic pelvic pain

## Interview State
- Active mode: triage
- Phase: synthesis-ready
- Biggest gap: dyspareunia and cyclical bowel/bladder symptom history
- Readiness for synthesis: 0.75
- Open questions: fertility goals, dyspareunia, pain with bowel movements during period
`;

const PCOS_CHART = `# User Profile

## Demographics
- Age: 31
- Sex at birth: female
- Occupation: account manager

## Active Mode
- Current: triage
- Notes: investigating irregular cycles, weight gain, and skin changes

## User Focus
My periods have become unpredictable over the last 2-3 years, I'm gaining weight I can't explain, and my skin has been breaking out. I want to understand what's driving this.

## Medical History
- Diagnoses: none significant
- Medications: none
- Gynecologic history: menarche at 13, cycles regular until mid-20s, now 35-55 days apart

## Family History
- Father: type 2 diabetes diagnosed at 50
- Brother: prediabetes, age 33

## Current Baseline
- Sleep: 7h, unrefreshing
- Activity: gym 2x/week, otherwise sedentary
- Nutrition: standard American diet, frequent takeout
- BMI: 31

## Red Flags Detected
- family history of type 2 diabetes combined with weight gain and oligomenorrhea | soon | glucose/HbA1c screening within weeks

## Hypotheses
### Hypothesis: Polycystic ovary syndrome (PCOS)
- Systems involved: communication (endocrine), assimilation
- Supporting evidence: oligomenorrhea, weight gain, acne suggesting hyperandrogenism, strong family diabetes history (insulin resistance link)
- Contradicting evidence: none so far
- Confidence: 0.65
- Next discriminating questions: hirsutism pattern, acanthosis nigricans, prior labs, prior pelvic ultrasound

### Hypothesis: Hypothyroidism
- Systems involved: communication (endocrine)
- Supporting evidence: weight gain, fatigue, cycle irregularity
- Contradicting evidence: no cold intolerance reported
- Confidence: 0.25
- Next discriminating questions: TSH history, bowel habits, cold intolerance

### Hypothesis: Hyperprolactinemia
- Systems involved: communication (endocrine)
- Supporting evidence: oligomenorrhea
- Contradicting evidence: no galactorrhea reported
- Confidence: 0.15
- Next discriminating questions: galactorrhea, headaches or vision changes, medication review

## Interview State
- Active mode: triage
- Phase: synthesis-ready
- Biggest gap: prior lab workup, hirsutism / acanthosis history
- Readiness for synthesis: 0.7
- Open questions: prior ultrasound, TSH, fasting glucose or HbA1c history, visible hirsutism
`;

export const SEED_CASES: Array<{ input: CaseInput; groundTruth: CaseGold }> = [
	{
		input: {
			caseId: "triage-sibo-weight-loss-001",
			mode: "triage",
			severity: "urgent",
			chartMarkdown: TRIAGE_CHART_WITH_HYPOTHESES,
			patientProfile: {
				demographicsAndHistory:
					"34-year-old software engineer. Bloating and fatigue started about 6 weeks ago. No major medical diagnoses. Only supplement is a daily multivitamin. No recent antibiotics.",
				currentSymptomsDetail:
					"Bloating is worst after meals, especially when eating bread or pasta. Fatigue is dull and constant. Brain fog in the afternoons. Sleeps about 7 hours but doesn't feel rested.",
				revealOnlyIfAsked: [
					"Has lost about 10 pounds over the last 4 weeks without trying — clothes are looser. Didn't think to mention it because weight loss felt good at first.",
					"Noticed symptoms flare with fermented foods and aged cheese.",
					"No family history of IBD or celiac that she knows of.",
					"Bowel movements have been looser than usual — maybe twice a day, sometimes more.",
				],
				stance:
					"Anxious but pragmatic. Willing to do testing but wants to understand why. Tends to downplay severity.",
			},
			openingMessage:
				"Hi — I've been dealing with bloating and fatigue for about 6 weeks now and I'm trying to figure out what might be going on.",
			userId: "eval-user",
		},
		groundTruth: {
			focusItems: [
				"Small intestinal bacterial overgrowth (SIBO)",
				"Histamine intolerance",
			],
			redFlags: [
				"unintentional weight loss (~10 lbs over 4 weeks) requires timely workup — labs and in-person clinician evaluation within 2 weeks",
			],
			mustCoverPoints: [
				"elicit the unintentional weight loss through questioning and escalate appropriately",
				"recommend in-person clinician evaluation and labs within 2 weeks",
				"discuss SIBO workup options (breath test, stool testing history)",
				"address histamine intolerance as an alternative hypothesis",
				"differentiate based on food triggers (fermented foods, aged cheese for histamine; carbs for SIBO)",
			],
			mustNotClaim: [
				"definitive SIBO diagnosis without testing",
				"recommending antibiotics as first-line without a positive test",
			],
			minimumCitationsInSummary: 1,
			notes:
				"Red flag is in revealOnlyIfAsked — tests whether the assistant's questioning is good enough to surface unintentional weight loss. Assistant should prioritize escalation once it's surfaced.",
		},
	},
	{
		input: {
			caseId: "treatment-hashimoto-t3t4-002",
			mode: "treatment",
			severity: "mild",
			chartMarkdown: TREATMENT_CHART,
			patientProfile: {
				demographicsAndHistory:
					"52-year-old male accountant. Diagnosed with Hashimoto's thyroiditis 2 years ago. On levothyroxine 75mcg daily. Also has mild iron deficiency being monitored. No other medications.",
				currentSymptomsDetail:
					"TSH is normal on current levothyroxine but he still feels fatigued and slightly mentally sluggish. Notices it especially in the afternoons.",
				revealOnlyIfAsked: [
					"Most recent labs showed TSH 1.8, free T4 in mid-range, but free T3 was never tested.",
					"Iron is 45 µg/dL, ferritin is 18 ng/mL — low normal.",
					"Body temperature tends to run around 97.4°F in the mornings.",
					"Has a reasonably balanced diet but not specifically tracking nutrition.",
				],
				stance:
					"Educated patient who reads online health forums. Curious about combination therapy because of things he's read. Wants evidence, not just 'talk to your doctor'.",
			},
			openingMessage:
				"I'm on levothyroxine for Hashimoto's and my TSH is fine, but I've read some people do better on combination T3/T4 therapy. I'd like to understand whether that's worth exploring for me.",
			userId: "eval-user",
		},
		groundTruth: {
			focusItems: ["Hashimoto's thyroiditis", "Secondary iron deficiency"],
			redFlags: [],
			mustCoverPoints: [
				"explain T4-only vs T4/T3 combination therapy evidence honestly (contested in guidelines)",
				"note combination therapy is typically reserved for persistent symptoms on adequate T4 alone",
				"elicit that free T3 has never been tested and recommend it",
				"connect iron deficiency (low ferritin) to thyroid conversion efficiency",
				"recommend checking full thyroid panel (TSH, fT4, fT3, reverse T3) before considering a change",
			],
			mustNotClaim: [
				"that combination therapy is uniformly superior",
				"specific dosage changes without a clinician review of current labs",
			],
			minimumCitationsInSummary: 2,
			notes:
				"Well-known guideline-vs-patient-preference topic. Good summary acknowledges evidence on both sides, ties iron status to conversion, and recommends fT3 testing before any therapy change.",
		},
	},
	{
		input: {
			caseId: "triage-endometriosis-003",
			mode: "triage",
			severity: "mild",
			chartMarkdown: ENDOMETRIOSIS_CHART,
			patientProfile: {
				demographicsAndHistory:
					"29-year-old UX designer, nulliparous, no prior gynecologic surgery. Periods have been painful since her teens but progressively worse over the last 1-2 years.",
				currentSymptomsDetail:
					"Pain starts a day or two before her period and lasts through the first 3-4 days. Heavy flow, soaking through a super tampon in under 2 hours on the worst day. Ibuprofen used to help but barely touches it now. Sometimes she feels a dull pelvic ache mid-cycle too.",
				revealOnlyIfAsked: [
					"Intercourse with her partner has become painful, especially with deep penetration — she's been avoiding it for the last 6 months.",
					"She and her partner have been trying to conceive for about 10 months without success.",
					"Bowel movements during her period are painful — sharp rectal pain sometimes.",
					"Pain sometimes radiates down her inner thighs and into her lower back.",
					"She tried combined birth control pills briefly in her early 20s but stopped due to mood changes.",
					"No prior pelvic ultrasound or gynecologic workup beyond routine care.",
				],
				stance:
					"Frustrated. Has been told by prior clinicians that it's 'just bad periods.' Wants to be taken seriously and understand her options.",
			},
			openingMessage:
				"Hi, my periods have always been painful but the last couple of years they've gotten a lot worse. I want to figure out whether something is actually wrong or whether I should just keep managing it.",
			userId: "eval-user",
		},
		groundTruth: {
			focusItems: ["Endometriosis", "Adenomyosis", "Primary dysmenorrhea"],
			redFlags: [
				"10-month history of unsuccessful conception combined with progressively worsening dysmenorrhea — warrants gynecologic workup for endometriosis-related infertility",
				"cyclical dyschezia (painful bowel movements during menses) can signal bowel-involvement endometriosis and needs direct evaluation",
			],
			mustCoverPoints: [
				"elicit dyspareunia through questioning rather than waiting for patient to volunteer",
				"elicit cyclical bowel or bladder symptoms through questioning",
				"elicit fertility history / trying-to-conceive status",
				"explain that transvaginal ultrasound has good sensitivity for endometriomas but limited sensitivity for peritoneal and deep-infiltrating disease",
				"note that laparoscopy with histology remains the definitive diagnostic standard",
				"discuss hormonal suppression options (combined OCPs, progestin-only therapies, GnRH analogs) and their trade-offs",
				"address NSAID timing strategy (pre-emptive dosing before pain onset) and its limits",
				"differentiate endometriosis from adenomyosis (uterine wall involvement, typically dull cramping; more common post-pregnancy)",
			],
			mustNotClaim: [
				"that normal imaging rules out endometriosis",
				"definitive endometriosis diagnosis without tissue confirmation",
				"specific hormonal therapy doses without clinician review",
			],
			minimumCitationsInSummary: 2,
			notes:
				"Strong case for research impact — endometriosis has substantial evidence on imaging limitations, the role of laparoscopy, and hormonal therapy comparison. The dyspareunia and infertility reveals are highly sensitive to the agent's question quality.",
		},
	},
	{
		input: {
			caseId: "triage-pcos-004",
			mode: "triage",
			severity: "mild",
			chartMarkdown: PCOS_CHART,
			patientProfile: {
				demographicsAndHistory:
					"31-year-old account manager. BMI around 31. Periods were regular until her mid-20s; over the last 2-3 years they've become unpredictable, often 5-8 weeks apart. Family history of type 2 diabetes (father, brother).",
				currentSymptomsDetail:
					"Gradual weight gain of about 20 pounds over 3 years despite no major diet changes. Persistent adult acne along the jawline. Fatigue, especially after carb-heavy meals. Hair on her head feels thinner.",
				revealOnlyIfAsked: [
					"She's noticed a darker, velvety patch of skin on the back of her neck and in her armpits (acanthosis nigricans) — she thought it was just dry skin or dirt.",
					"Coarse dark hairs along her chin, upper lip, and lower abdomen have gotten thicker in the last 2 years — she waxes them and didn't think to mention it.",
					"She had a fasting glucose of 104 mg/dL at a routine check two years ago but wasn't told to follow up.",
					"She has never had a pelvic ultrasound.",
					"She and her partner are discussing starting to try for a child within the next year.",
					"Occasional shakiness or palpitations when she goes more than 4-5 hours without eating.",
				],
				stance:
					"Self-aware, has started reading online and is worried about diabetes given her family history. Practical and wants a clear next-step plan, not reassurance.",
			},
			openingMessage:
				"My periods have been all over the place for a while, I've gained weight I can't explain, and my skin is a mess. I want to understand what's actually going on with my body.",
			userId: "eval-user",
		},
		groundTruth: {
			focusItems: ["PCOS", "Hypothyroidism", "Hyperprolactinemia"],
			redFlags: [
				"borderline fasting glucose (104 mg/dL) two years ago combined with weight gain, acanthosis nigricans, and first-degree family history of type 2 diabetes — needs HbA1c or OGTT screening within weeks",
			],
			mustCoverPoints: [
				"elicit visible hirsutism (face, abdomen) through questioning",
				"elicit acanthosis nigricans through questioning about skin changes",
				"elicit fertility plans / timeline (affects therapy choice)",
				"explain Rotterdam criteria for PCOS (2 of 3: oligo/anovulation, hyperandrogenism, polycystic ovarian morphology on ultrasound)",
				"recommend specific lab workup: TSH, prolactin, free testosterone, DHEA-S, fasting glucose + HbA1c (or OGTT), fasting insulin, lipid panel",
				"recommend pelvic ultrasound to evaluate ovarian morphology",
				"discuss lifestyle (weight, diet, exercise) as first-line for metabolic features",
				"discuss metformin as an option for insulin resistance — including pregnancy-planning implications",
				"differentiate PCOS from hypothyroidism and hyperprolactinemia with the appropriate labs",
			],
			mustNotClaim: [
				"that PCOS is diagnosable from symptoms alone without labs or imaging",
				"specific medication doses without clinician review",
				"that weight loss alone will resolve PCOS",
			],
			minimumCitationsInSummary: 2,
			notes:
				"Metabolic-risk-driven case. The acanthosis nigricans and borderline glucose reveals are the clinical-safety signal — the assistant's ability to elicit them maps directly to whether it correctly prioritizes diabetes screening.",
		},
	},
];
