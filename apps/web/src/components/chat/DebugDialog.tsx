import { Dialog } from "@atlas/subframe/components/Dialog";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { FeatherX } from "@subframe/core";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";

type DebugDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	markdown: string;
};

/**
 * Dialog shell used by the per-message debug panel. Renders the passed
 * markdown through ChatMarkdown so headings, code blocks, lists, and
 * tables all look consistent with the rest of the chat surface.
 *
 * Pure presentation — the caller owns open state and decides which
 * markdown payload to show.
 */
export function DebugDialog({
	open,
	onOpenChange,
	title,
	markdown,
}: DebugDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content className="w-[min(900px,96vw)] max-h-[85vh] overflow-hidden">
				<div className="flex w-full items-center justify-between gap-4 border-b border-solid border-neutral-border px-5 py-3">
					<span className="text-heading-3 font-heading-3 text-default-font">
						{title}
					</span>
					<IconButton
						size="small"
						icon={<FeatherX />}
						onClick={() => onOpenChange(false)}
					/>
				</div>
				<div className="w-full flex-1 overflow-y-auto px-5 py-4">
					<ChatMarkdown text={markdown} className="text-default-font" />
				</div>
			</Dialog.Content>
		</Dialog>
	);
}
