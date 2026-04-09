import type { UIMessage } from "ai";
import { FlaskConical, Notebook, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { DebugDialog } from "@/components/chat/DebugDialog";
import {
	type DebugSnapshot,
	formatResearchRoundMarkdown,
	formatToolCallMarkdown,
	formatWorkingMemoryMarkdown,
} from "@/components/chat/debug-format";

type DebugMessageActionsProps = {
	message: UIMessage;
	snapshot: DebugSnapshot | undefined;
};

type DialogState =
	| { kind: "closed" }
	| { kind: "tool" }
	| { kind: "research" }
	| { kind: "memory" };

/**
 * Extract the `getLatestResearch` tool call output from an AI SDK v6
 * message's parts array. Tool parts use `type: "tool-<toolName>"` and
 * carry an `output` field populated after the call returns.
 */
function findGetLatestResearchOutput(message: UIMessage): unknown {
	const parts = (message.parts ?? []) as Array<{
		type: string;
		output?: unknown;
	}>;
	const part = parts.find((p) => p.type === "tool-getLatestResearch");
	return part?.output;
}

/**
 * Row of three icon buttons rendered below each assistant message in the
 * chat. Each opens a dialog with the corresponding debug payload:
 *   - Wrench       → the getLatestResearch tool call output (from message.parts)
 *   - FlaskConical → the nearest completed research round (from the snapshot)
 *   - Notebook     → the working memory at snapshot time
 *
 * Tool-call button is always enabled because tool parts are part of the
 * message itself. Research + memory buttons wait for the snapshot to be
 * fetched; if the snapshot is missing (dev endpoint disabled or no row
 * yet), they render disabled.
 */
export function DebugMessageActions({
	message,
	snapshot,
}: DebugMessageActionsProps) {
	const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });

	const toolOutput = useMemo(
		() => findGetLatestResearchOutput(message),
		[message],
	);
	const hasToolOutput = toolOutput !== undefined;
	const hasSnapshot = snapshot !== undefined;
	const hasResearchRound = Boolean(snapshot?.researchRound);

	const toolMarkdown = useMemo(
		() => formatToolCallMarkdown(toolOutput ?? null),
		[toolOutput],
	);
	const researchMarkdown = useMemo(
		() => formatResearchRoundMarkdown(snapshot?.researchRound ?? null),
		[snapshot],
	);
	const memoryMarkdown = useMemo(
		() => formatWorkingMemoryMarkdown(snapshot?.workingMemory ?? null),
		[snapshot],
	);

	const close = () => setDialog({ kind: "closed" });

	return (
		<>
			<div className="mt-1 flex items-center gap-1 opacity-50 transition-opacity hover:opacity-100">
				<DebugIconButton
					icon={<Wrench className="h-3.5 w-3.5" />}
					label="Tool call output (getLatestResearch)"
					disabled={!hasToolOutput}
					onClick={() => setDialog({ kind: "tool" })}
				/>
				<DebugIconButton
					icon={<FlaskConical className="h-3.5 w-3.5" />}
					label={
						hasSnapshot
							? hasResearchRound
								? "Research round (brief, workers, synthesis)"
								: "No research round was available when this message was generated"
							: "Snapshot pending…"
					}
					disabled={!hasSnapshot}
					onClick={() => setDialog({ kind: "research" })}
				/>
				<DebugIconButton
					icon={<Notebook className="h-3.5 w-3.5" />}
					label={hasSnapshot ? "Working memory snapshot" : "Snapshot pending…"}
					disabled={!hasSnapshot}
					onClick={() => setDialog({ kind: "memory" })}
				/>
			</div>

			<DebugDialog
				open={dialog.kind === "tool"}
				onOpenChange={(open) => !open && close()}
				title="Tool call · getLatestResearch"
				markdown={toolMarkdown}
			/>
			<DebugDialog
				open={dialog.kind === "research"}
				onOpenChange={(open) => !open && close()}
				title="Research round"
				markdown={researchMarkdown}
			/>
			<DebugDialog
				open={dialog.kind === "memory"}
				onOpenChange={(open) => !open && close()}
				title="Working memory"
				markdown={memoryMarkdown}
			/>
		</>
	);
}

type DebugIconButtonProps = {
	icon: React.ReactNode;
	label: string;
	disabled: boolean;
	onClick: () => void;
};

/**
 * Small unstyled button used inside the debug actions row. Not using
 * Subframe's IconButton here because we want a much smaller footprint
 * that doesn't compete with the chat content visually.
 */
function DebugIconButton({
	icon,
	label,
	disabled,
	onClick,
}: DebugIconButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className="flex h-6 w-6 items-center justify-center rounded text-subtext-color transition-colors hover:bg-neutral-100 hover:text-default-font disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-subtext-color"
		>
			{icon}
		</button>
	);
}
