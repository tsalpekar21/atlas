import { AnimatePresence } from "framer-motion";
import {
	FadeIn,
	MOTION_DURATION_FAST,
	MOTION_FADE_Y_SM,
} from "@/components/motion";
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
				<FadeIn
					key="research-indicator"
					y={MOTION_FADE_Y_SM}
					duration={MOTION_DURATION_FAST}
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
				</FadeIn>
			) : null}
		</AnimatePresence>
	);
}
