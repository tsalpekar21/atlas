"use client";

import { motion } from "framer-motion";

type ChatLoadingIndicatorProps = {
	show: boolean;
};

export function ChatMessageLoadingIndicator({
	show,
}: ChatLoadingIndicatorProps) {
	if (!show) return null;

	return (
		<motion.div
			key="thinking"
			role="status"
			aria-live="polite"
			aria-label="Assistant is thinking"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -4 }}
			transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
			className="flex w-full min-w-0 justify-start"
		>
			<div className="relative overflow-hidden rounded-lg px-4 py-3">
				<span className="text-body font-body bg-linear-to-r from-neutral-400 via-neutral-600 to-neutral-400 bg-size-[200%_100%] bg-clip-text text-transparent animate-shimmer">
					Thinking…
				</span>
			</div>
		</motion.div>
	);
}
