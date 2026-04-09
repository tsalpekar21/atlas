/**
 * Formatters for the debug panel. Each function converts a structured
 * debug payload into a markdown string that `ChatMarkdown` can render.
 * Kept separate from the component so the formatting logic is easy to
 * test and tweak in isolation.
 */

export type DebugResearchRound = {
	id: string;
	createdAt: string;
	brief: unknown;
	synthesis: unknown;
	evidenceItems: unknown;
	suggestedQuestions: unknown;
	escalationFlags: unknown;
	workerOutputs: {
		guideline?: string;
		literature?: string;
	} | null;
};

export type DebugSnapshot = {
	messageId: string;
	threadId: string;
	createdAt: string;
	workingMemory: string | null;
	researchRound: DebugResearchRound | null;
};

/** Stable JSON formatter: pretty-printed, sorted keys. */
function jsonBlock(value: unknown): string {
	const body =
		value === null || value === undefined
			? "(empty)"
			: JSON.stringify(value, null, 2);
	return "```json\n" + body + "\n```";
}

/**
 * Format the `output` of a `tool-getLatestResearch` tool-call part.
 * Accepts whatever the tool returned (shape is the `getLatestResearch`
 * tool's output schema from `apps/api/.../tools/get-latest-research.ts`).
 * Unavailable research shows a friendly note instead of an empty block.
 */
export function formatToolCallMarkdown(toolOutput: unknown): string {
	if (!toolOutput || typeof toolOutput !== "object") {
		return "# getLatestResearch tool output\n\n_No tool output captured on this message._";
	}
	const available = (toolOutput as { available?: boolean }).available;
	const intro =
		available === false
			? "_The tool returned `{ available: false }` — no completed research round existed when the assistant called it on this turn._"
			: "_Below is the compact brief that the assistant consumed when generating its reply._";
	return `# getLatestResearch tool output\n\n${intro}\n\n${jsonBlock(toolOutput)}`;
}

/**
 * Format a full research round for display. Sections render as
 * markdown H2s so they collapse naturally in the dialog. Raw worker
 * text is surfaced verbatim so you can see exactly what each worker
 * said before synthesis collapsed it.
 */
export function formatResearchRoundMarkdown(
	round: DebugResearchRound | null,
): string {
	if (!round) {
		return "# Research round\n\n_No completed research round existed when this message was generated._";
	}

	const guidelineText =
		round.workerOutputs?.guideline?.trim() || "_(no output)_";
	const literatureText =
		round.workerOutputs?.literature?.trim() || "_(no output)_";

	return [
		`# Research round ${round.id}`,
		`_Completed ${round.createdAt}_`,
		"",
		"## Brief",
		"",
		"_The deterministic brief that was handed to the workers._",
		"",
		jsonBlock(round.brief),
		"",
		"## Guideline worker — raw text",
		"",
		guidelineText,
		"",
		"## Literature worker — raw text",
		"",
		literatureText,
		"",
		"## Synthesis",
		"",
		"_The synthesizer's structured merge of the worker outputs. The triage agent reads this on its next turn via `getLatestResearch`._",
		"",
		jsonBlock(round.synthesis),
	].join("\n");
}

/** Working memory is already markdown — just prepend a header. */
export function formatWorkingMemoryMarkdown(memory: string | null): string {
	if (!memory || !memory.trim()) {
		return "# Working memory\n\n_Empty — the assistant has not updated working memory for this message yet._";
	}
	return `# Working memory snapshot\n\n${memory}`;
}
