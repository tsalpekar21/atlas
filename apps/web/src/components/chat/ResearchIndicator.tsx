import { AnimatePresence, motion } from "framer-motion";
import type { ResearchStatus } from "@/hooks/use-research-status";

type Props = {
	status: ResearchStatus;
	active: boolean;
};

const LABELS: Partial<Record<ResearchStatus, string>> = {
	planning: "Planning research…",
	researching: "Researching…",
	synthesizing: "Synthesizing findings…",
	persisting: "Saving findings…",
};

/**
 * Small pulsing pill that surfaces background research activity to the
 * patient. Shown only while a round is in an active phase; hidden for
 * idle/complete/skipped/failed.
 */
export function ResearchIndicator({ status, active }: Props) {
	const label = LABELS[status];
	return (
		<AnimatePresence>
			{active && label ? (
				<motion.div
					key="research-indicator"
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -4 }}
					transition={{ duration: 0.25 }}
					className="flex items-center gap-2 rounded-full border border-solid border-neutral-border bg-neutral-50 px-3 py-0.5"
					aria-live="polite"
				>
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
					</span>
					<span className="text-caption font-caption text-subtext-color">
						{label}
					</span>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
