import { createHash } from "node:crypto";
import { logger } from "@atlas/logger";
import type { Mastra } from "@mastra/core/mastra";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { researchFindings } from "../db/schema.ts";
import { HEALTH_ASSISTANT_AGENT_ID } from "./threads/constants.ts";

/**
 * Sections excluded from the chart hash. Most importantly the `Research Log`,
 * so that a research round updating its own log cannot cause a re-trigger
 * loop. Every other section in the profile contributes to the hash — this
 * keeps the gate robust as the assistant adds mode-specific sections
 * (Symptoms, Hypotheses, Treatment Options, Health Goals, etc.) that the
 * original triage template didn't anticipate.
 */
const HASH_EXCLUDED_SECTIONS = new Set(["Research Log"]);

/** Split a chart markdown doc into `## Heading` sections. */
export function parseChartSections(md: string): Map<string, string> {
	const sections = new Map<string, string>();
	const lines = md.split("\n");
	let current: string | null = null;
	let buf: string[] = [];
	for (const line of lines) {
		if (line.startsWith("## ") && !line.startsWith("### ")) {
			if (current) sections.set(current, buf.join("\n").trim());
			current = line.slice(3).trim();
			buf = [];
			continue;
		}
		buf.push(line);
	}
	if (current) sections.set(current, buf.join("\n").trim());
	return sections;
}

/**
 * Split a `## Section` body into its `### Subsection` blocks. Preserves
 * order and returns each subsection's body (without the `### Label` line).
 * Used for the chief-complaints and hypotheses sections which are each a
 * repeatable block of the same shape in the chart template.
 */
function parseSubsections(body: string): Array<{ label: string; body: string }> {
	const out: Array<{ label: string; body: string }> = [];
	const lines = body.split("\n");
	let currentLabel: string | null = null;
	let buf: string[] = [];
	for (const line of lines) {
		if (line.startsWith("### ")) {
			if (currentLabel !== null) {
				out.push({ label: currentLabel, body: buf.join("\n").trim() });
			}
			currentLabel = line.slice(4).trim();
			buf = [];
			continue;
		}
		buf.push(line);
	}
	if (currentLabel !== null) {
		out.push({ label: currentLabel, body: buf.join("\n").trim() });
	}
	return out;
}

/**
 * Pull the value off a "- key: value" bullet line. Returns empty string if
 * the key is absent or the value is empty. Case-insensitive key match.
 */
function readField(body: string, key: string): string {
	const re = new RegExp(`^-\\s*${key}\\s*:\\s*(.*)$`, "im");
	const m = body.match(re);
	return m ? m[1].trim() : "";
}

/**
 * Pull a comma- or bullet-separated list off a "- key: ..." line. Handles
 * both inline ("- Systems involved: assimilation, defense & repair") and
 * nested-bullet formats.
 */
function readList(body: string, key: string): string[] {
	const inline = readField(body, key);
	if (inline) {
		return inline
			.split(/[,;]/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

function parseConfidence(raw: string): number {
	const m = raw.match(/([01](?:\.\d+)?|\.\d+)/);
	if (!m) return 0;
	const n = Number.parseFloat(m[1]);
	return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/**
 * Intermediate shape used while parsing the chart. Each "focus item" is a
 * thing the research workers should investigate: a diagnostic hypothesis
 * (triage mode), a condition the user is managing (treatment mode), or a
 * health goal (goals mode). The `kind` discriminator lets downstream
 * consumers tailor their output.
 */
type RawFocusItem = {
	label: string;
	kind: "hypothesis" | "condition" | "goal";
	systems: string[];
	confidence: number;
	notes: string[];
	nextQuestions: string[];
	contradictingEvidence: string[];
};

type ChartRedFlag = {
	description: string;
	urgency?: string;
	actionAdvised?: string;
};

/**
 * Rank order used when mapping an arbitrary set of per-flag urgencies to a
 * single `riskLevel` for the research brief.
 */
const URGENCY_ORDER = ["routine", "soon", "urgent", "emergency"] as const;
type UrgencyLevel = (typeof URGENCY_ORDER)[number];

function escalate(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
	return URGENCY_ORDER.indexOf(a) >= URGENCY_ORDER.indexOf(b) ? a : b;
}

function normalizeUrgency(raw: string | undefined): UrgencyLevel | undefined {
	if (!raw) return undefined;
	const lower = raw.toLowerCase().trim();
	if (lower.includes("emerg")) return "emergency";
	if (lower.includes("urgent")) return "urgent";
	if (lower.includes("soon")) return "soon";
	if (lower.includes("routine")) return "routine";
	return undefined;
}

/** Read the user's active mode out of the `## Active Mode` section. */
function parseActiveMode(body: string): ResearchMode {
	const current = readField(body, "Current").toLowerCase();
	if (current.includes("treatment")) return "treatment";
	if (current.includes("goal")) return "goals";
	if (current.includes("triage")) return "triage";
	// Default: triage. Matches the old behavior before modes existed.
	return "triage";
}

function parseHypotheses(body: string): RawFocusItem[] {
	return parseSubsections(body)
		.filter((s) => s.label.toLowerCase().startsWith("hypothesis"))
		.map(({ label, body }) => {
			const name = label.replace(/^hypothesis\s*:\s*/i, "").trim();
			const supporting = readList(body, "Supporting evidence");
			return {
				label: name,
				kind: "hypothesis" as const,
				systems: readList(body, "Systems involved"),
				confidence: parseConfidence(readField(body, "Confidence")),
				notes: supporting.slice(0, 4),
				nextQuestions: readList(body, "Next discriminating questions"),
				contradictingEvidence: readList(body, "Contradicting evidence"),
			};
		})
		.filter((h) => h.label.length > 0 && !h.label.startsWith("["));
}

function parseConditions(body: string): RawFocusItem[] {
	return parseSubsections(body)
		.filter((s) => s.label.toLowerCase().startsWith("condition"))
		.map(({ label, body }) => {
			const name = label.replace(/^condition\s*:\s*/i, "").trim();
			const notes: string[] = [];
			const certainty = readField(body, "Diagnostic certainty");
			const stage =
				readField(body, "Stage / severity") || readField(body, "Stage");
			const current = readField(body, "Current treatments");
			const prior = readField(body, "Prior treatments tried");
			const priorities = readField(body, "User priorities");
			if (certainty) notes.push(`certainty: ${certainty}`);
			if (stage) notes.push(`stage: ${stage}`);
			if (current) notes.push(`current: ${current}`);
			if (prior) notes.push(`prior: ${prior}`);
			if (priorities) notes.push(`priorities: ${priorities}`);
			return {
				label: name,
				kind: "condition" as const,
				systems: [],
				// Conditions don't carry a true probability; we use a fixed
				// 0.7 so the synthesizer's "updated rankings" still has a
				// sane numeric floor to shift from.
				confidence: parseConfidence(certainty) || 0.7,
				notes,
				nextQuestions: [],
				contradictingEvidence: [],
			};
		})
		.filter((c) => c.label.length > 0 && !c.label.startsWith("["));
}

function parseHealthGoals(body: string): RawFocusItem[] {
	return parseSubsections(body)
		.filter((s) => s.label.toLowerCase().startsWith("goal"))
		.map(({ label, body }) => {
			const name = label.replace(/^goal\s*:\s*/i, "").trim();
			const notes: string[] = [];
			const target = readField(body, "Target");
			const timeline = readField(body, "Timeline");
			const why = readField(body, "Why this goal");
			const baseline =
				readField(body, "Baseline (current state)") ||
				readField(body, "Baseline");
			const constraints = readField(body, "Constraints");
			const prior = readField(body, "Prior attempts");
			if (target) notes.push(`target: ${target}`);
			if (timeline) notes.push(`timeline: ${timeline}`);
			if (why) notes.push(`why: ${why}`);
			if (baseline) notes.push(`baseline: ${baseline}`);
			if (constraints) notes.push(`constraints: ${constraints}`);
			if (prior) notes.push(`prior attempts: ${prior}`);
			return {
				label: name,
				kind: "goal" as const,
				systems: [],
				// Goals have no "confidence" — this is a placeholder so the
				// unified schema doesn't need per-kind optional fields.
				confidence: 0.5,
				notes,
				nextQuestions: [],
				contradictingEvidence: [],
			};
		})
		.filter((g) => g.label.length > 0 && !g.label.startsWith("["));
}

function parseRedFlags(body: string): ChartRedFlag[] {
	// Template comment says "Each flag: description | urgency | action advised"
	const out: ChartRedFlag[] = [];
	for (const line of body.split("\n")) {
		const trimmed = line.trim().replace(/^-\s*/, "");
		if (!trimmed || trimmed.startsWith("<!--")) continue;
		const parts = trimmed.split("|").map((s) => s.trim());
		if (parts.length === 0 || !parts[0]) continue;
		out.push({
			description: parts[0],
			urgency: parts[1],
			actionAdvised: parts[2],
		});
	}
	return out;
}

function parseOpenQuestions(interviewStateBody: string): string[] {
	// "Open questions:" may be followed by nested bullets OR be inline.
	const lines = interviewStateBody.split("\n");
	const openIdx = lines.findIndex((l) => /open questions\s*:/i.test(l));
	if (openIdx < 0) return [];
	const inline = lines[openIdx].split(":").slice(1).join(":").trim();
	const items: string[] = [];
	if (inline) items.push(...inline.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
	for (let i = openIdx + 1; i < lines.length; i++) {
		const m = lines[i].match(/^\s*-\s*(.+)$/);
		if (m && m[1].trim()) items.push(m[1].trim());
		else if (lines[i].trim() && !lines[i].startsWith(" ")) break;
	}
	return items;
}

/**
 * Deterministically extract a research brief from the user profile. This
 * replaces the former `researchPlanner` LLM step and is mode-aware — the
 * assistant's currently-active mode determines which section becomes the
 * source of focus items (Hypotheses for triage, Conditions Being Explored
 * for treatment, Health Goals for goals). Modes can blend: all three
 * sources are parsed regardless of mode, and secondary items are folded
 * in after the primary ones so the workers see everything the profile
 * knows about.
 *
 * The decision to skip is rule-based:
 *   - No focus items AND no red flags → `shouldResearch: false`.
 *   - Otherwise proceed; the workflow's `gateByHash` step has already
 *     ensured the chart is actually different from the last completed
 *     round, so we can trust "there's something to research."
 *
 * `riskLevel` is derived from the highest-urgency red flag present.
 */
export function extractBriefFromChart(chartMarkdown: string): PlannerDecision {
	const sections = parseChartSections(chartMarkdown);

	const mode = parseActiveMode(sections.get("Active Mode") ?? "");

	// Parse all three possible focus-item sources. Modes blend, so even
	// in non-triage modes we still fold hypotheses through to the workers.
	const hypotheses = parseHypotheses(sections.get("Hypotheses") ?? "").sort(
		(a, b) => b.confidence - a.confidence,
	);
	const conditions = parseConditions(
		sections.get("Conditions Being Explored") ?? "",
	);
	const healthGoals = parseHealthGoals(sections.get("Health Goals") ?? "");

	// Primary bucket comes from the active mode; the other buckets are
	// appended as secondary context.
	const primary: RawFocusItem[] =
		mode === "triage"
			? hypotheses
			: mode === "treatment"
				? conditions
				: healthGoals;
	const secondary: RawFocusItem[] = [
		...(mode !== "triage" ? hypotheses : []),
		...(mode !== "treatment" ? conditions : []),
		...(mode !== "goals" ? healthGoals : []),
	];
	const focusItems = [...primary, ...secondary];

	const redFlagsRaw = parseRedFlags(sections.get("Red Flags Detected") ?? "");
	const openQuestions = parseOpenQuestions(
		sections.get("Interview State") ?? "",
	);

	if (focusItems.length === 0 && redFlagsRaw.length === 0) {
		return {
			shouldResearch: false,
			reason: "no focus items or red flags in profile yet",
			brief: null,
		};
	}

	// researchQuestions: pull from the top focus items' discriminating
	// questions (primarily populated in triage mode), falling back to the
	// profile's Open Questions list. Capped at 4 to keep the brief compact.
	const questionSet = new Set<string>();
	for (const item of focusItems.slice(0, 2)) {
		for (const q of item.nextQuestions) {
			if (q && !questionSet.has(q)) questionSet.add(q);
			if (questionSet.size >= 4) break;
		}
		if (questionSet.size >= 4) break;
	}
	if (questionSet.size === 0) {
		for (const q of openQuestions) {
			if (q && !questionSet.has(q)) questionSet.add(q);
			if (questionSet.size >= 4) break;
		}
	}
	const researchQuestions = Array.from(questionSet);

	// unknowns: prefer profile Open Questions, else fall back to top
	// focus items' contradicting evidence (interview gaps).
	let unknowns = openQuestions.slice(0, 6);
	if (unknowns.length === 0) {
		const gaps = new Set<string>();
		for (const item of focusItems.slice(0, 2)) {
			for (const e of item.contradictingEvidence) {
				if (e) gaps.add(e);
				if (gaps.size >= 4) break;
			}
		}
		unknowns = Array.from(gaps);
	}

	// riskLevel: highest urgency across all red flags; default routine.
	let riskLevel: UrgencyLevel = "routine";
	for (const flag of redFlagsRaw) {
		const normalized = normalizeUrgency(flag.urgency);
		if (normalized) riskLevel = escalate(riskLevel, normalized);
	}

	// context: compact paragraph from demographics + the user's own
	// free-form focus line + the leading focus item. Missing pieces are
	// dropped gracefully.
	const demographics = sections.get("Demographics") ?? "";
	const age = readField(demographics, "Age");
	const sex = readField(demographics, "Sex at birth");
	const occ = readField(demographics, "Occupation");
	const bioParts = [age, sex, occ].filter(Boolean);
	const bio = bioParts.length ? bioParts.join(", ") : "user";
	const userFocus = (sections.get("User Focus") ?? "")
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("<!--") && !l.startsWith("-->"))
		.join(" ")
		.trim();
	const focusSummary = userFocus || "user focus not yet documented";
	const leader = focusItems[0]
		? `Leading focus: ${focusItems[0].label} (${focusItems[0].kind}${
				focusItems[0].kind === "hypothesis"
					? `, confidence ${focusItems[0].confidence.toFixed(2)}`
					: ""
			}).`
		: "No dominant focus yet.";
	const context = `[mode: ${mode}] ${bio}. ${focusSummary}. ${leader}`;

	const brief: PlannerBrief = {
		mode,
		context,
		focusItems: focusItems.map((f) => ({
			label: f.label,
			kind: f.kind,
			systems: f.systems,
			confidence: f.confidence,
			notes: f.notes,
		})),
		unknowns,
		researchQuestions,
		riskLevel,
	};

	return {
		shouldResearch: true,
		reason: `mode=${mode}, ${focusItems.length} focus item(s), ${redFlagsRaw.length} red flag(s)`,
		brief,
	};
}

/**
 * Stable hash over the interview-relevant sections of the profile. Two
 * calls with semantically identical input return the same digest. Used as
 * the gate in `gateByHash` — if the hash matches the last completed
 * round's hash, we skip the research round entirely.
 *
 * Sections are sorted alphabetically for canonical ordering so that the
 * agent reordering sections during an update doesn't invalidate the hash.
 */
export function computeChartHash(chartMarkdown: string): string {
	const sections = parseChartSections(chartMarkdown);
	const canonical: string[] = [];
	const names = Array.from(sections.keys())
		.filter((n) => !HASH_EXCLUDED_SECTIONS.has(n))
		.sort();
	for (const name of names) {
		const body = sections.get(name) ?? "";
		canonical.push(`## ${name}\n${body}`);
	}
	return createHash("sha256").update(canonical.join("\n\n")).digest("hex");
}

/**
 * Pull the current working memory chart for a given thread. Returns an empty
 * string if no chart has been materialized yet.
 */
export async function getThreadChart(
	mastra: Mastra,
	threadId: string,
	resourceId: string,
): Promise<string> {
	const agent = mastra.getAgent(HEALTH_ASSISTANT_AGENT_ID);
	const memory = await agent.getMemory();
	if (!memory) return "";
	try {
		const wm = await memory.getWorkingMemory({
			threadId,
			resourceId,
		});
		return wm ?? "";
	} catch (err) {
		logger.warn({ err, threadId }, "research: failed to read working memory");
		return "";
	}
}

export type ResearchMode = "triage" | "treatment" | "goals";

/**
 * Unified research brief used across all three health-assistant modes.
 *
 * `focusItems` is the generic "things to investigate" concept that
 * replaces the old triage-only `hypotheses` field. Each item carries a
 * `kind` so workers and the synthesizer can shape their output
 * appropriately — diagnostic hypotheses get confidence scores, treatment
 * options get evidence summaries, goals get intervention evidence.
 */
export type PlannerBrief = {
	mode: ResearchMode;
	context: string;
	focusItems: Array<{
		label: string;
		kind: "hypothesis" | "condition" | "goal";
		systems: string[];
		confidence: number;
		notes: string[];
	}>;
	unknowns: string[];
	researchQuestions: string[];
	riskLevel: "routine" | "soon" | "urgent" | "emergency";
};

export type PlannerDecision = {
	shouldResearch: boolean;
	reason: string;
	brief: PlannerBrief | null;
};

export type ResearchSynthesis = {
	updatedRankings?: Array<{
		label: string;
		previousConfidence?: number;
		newConfidence?: number;
		reason?: string;
	}>;
	evidenceItems?: Array<{
		claim: string;
		source?: string;
		sourceQuality?: string;
		relationship?: string;
		hypothesis?: string;
		facts?: string[];
		confidence?: number;
	}>;
	suggestedQuestions?: string[];
	escalationFlags?: Array<{
		description: string;
		urgency?: string;
		actionAdvised?: string;
	}>;
	openQuestions?: string[];
	whatChanged?: string;
	rawText?: string;
	/**
	 * Raw text returned by each parallel worker agent. Populated by the
	 * `synthesize` workflow step so the debug UI can surface what each
	 * worker actually said alongside the final synthesized output.
	 */
	workerOutputs?: {
		guideline?: string;
		literature?: string;
	};
};

export async function insertRunningRound(args: {
	threadId: string;
	userId: string;
	chartHash: string;
	brief: PlannerBrief;
}): Promise<string> {
	const [row] = await db
		.insert(researchFindings)
		.values({
			threadId: args.threadId,
			userId: args.userId,
			chartHash: args.chartHash,
			status: "running",
			brief: args.brief,
		})
		.returning({ id: researchFindings.id });
	return row.id;
}

export async function insertSkippedRound(args: {
	threadId: string;
	userId: string;
	chartHash: string;
	reason: string;
}): Promise<void> {
	await db.insert(researchFindings).values({
		threadId: args.threadId,
		userId: args.userId,
		chartHash: args.chartHash,
		status: "skipped",
		whatChanged: args.reason,
	});
}

export async function markRoundComplete(args: {
	id: string;
	synthesis: ResearchSynthesis;
}): Promise<void> {
	await db
		.update(researchFindings)
		.set({
			status: "complete",
			synthesis: args.synthesis,
			evidenceItems: args.synthesis.evidenceItems ?? [],
			suggestedQuestions: args.synthesis.suggestedQuestions ?? [],
			escalationFlags: args.synthesis.escalationFlags ?? [],
			whatChanged: args.synthesis.whatChanged ?? null,
		})
		.where(eq(researchFindings.id, args.id));
}

export async function markRoundFailed(args: {
	id: string;
	error: string;
}): Promise<void> {
	await db
		.update(researchFindings)
		.set({ status: "failed", errorMessage: args.error })
		.where(eq(researchFindings.id, args.id));
}

/**
 * Returns the most recent completed research round for a thread, or null.
 * This is what the triage `getLatestResearch` tool reads on every turn.
 */
export async function getLatestCompletedRound(
	threadId: string,
): Promise<typeof researchFindings.$inferSelect | null> {
	const rows = await db
		.select()
		.from(researchFindings)
		.where(
			and(
				eq(researchFindings.threadId, threadId),
				eq(researchFindings.status, "complete"),
			),
		)
		.orderBy(desc(researchFindings.createdAt))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Returns the hash of the last completed round for a thread. Used by the
 * workflow's gateByHash step to decide whether to skip.
 */
export async function getLastCompletedHash(
	threadId: string,
): Promise<string | null> {
	const row = await getLatestCompletedRound(threadId);
	return row?.chartHash ?? null;
}

/** Small history list for the `/research/:threadId` endpoint. */
export async function listResearchHistory(threadId: string, limit = 20) {
	return db
		.select({
			id: researchFindings.id,
			createdAt: researchFindings.createdAt,
			status: researchFindings.status,
			whatChanged: researchFindings.whatChanged,
			suggestedQuestions: researchFindings.suggestedQuestions,
			escalationFlags: researchFindings.escalationFlags,
		})
		.from(researchFindings)
		.where(eq(researchFindings.threadId, threadId))
		.orderBy(desc(researchFindings.createdAt))
		.limit(limit);
}

/**
 * Fire-and-forget: start a background research workflow run for this thread.
 *
 * Uses `startAsync` so we return immediately after the Inngest event is
 * queued — the workflow then runs independently inside Inngest. Inngest
 * applies soft debounce + singleton-per-thread concurrency (configured on
 * `backgroundResearchWorkflow`), so calling this after every chat turn is
 * safe: tight back-and-forth coalesces into a single round.
 */
export async function enqueueResearchEvaluation(args: {
	mastra: Mastra;
	threadId: string;
	userId: string;
}): Promise<void> {
	try {
		const workflow = args.mastra.getWorkflow("backgroundResearch");
		const run = await workflow.createRun();
		await run.startAsync({
			inputData: { threadId: args.threadId, userId: args.userId },
		});
		logger.info(
			{
				component: "research.workflow",
				event: "enqueued",
				threadId: args.threadId,
				runId: run.runId,
			},
			"background research enqueued",
		);
	} catch (err) {
		logger.error(
			{
				component: "research.workflow",
				event: "enqueue_failed",
				err,
				threadId: args.threadId,
			},
			"failed to start background research workflow",
		);
	}
}
