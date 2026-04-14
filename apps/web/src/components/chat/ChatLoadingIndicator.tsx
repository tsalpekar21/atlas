"use client";

import { FadeIn } from "@/components/motion";

type ChatLoadingIndicatorProps = {
	show: boolean;
};

export function ChatMessageLoadingIndicator({
	show,
}: ChatLoadingIndicatorProps) {
	if (!show) return null;

	return (
		<FadeIn
			key="thinking"
			role="status"
			aria-live="polite"
			aria-label="Assistant is thinking"
			className="flex w-full min-w-0 justify-start"
		>
			<div className="relative overflow-hidden rounded-lg px-4 py-3">
				<span className="text-body font-body bg-linear-to-r from-neutral-400 via-neutral-600 to-neutral-400 bg-size-[200%_100%] bg-clip-text text-transparent animate-shimmer">
					Thinking…
				</span>
			</div>
		</FadeIn>
	);
}
