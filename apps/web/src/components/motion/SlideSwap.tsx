import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION_SLIDE_X, MOTION_SPRING_SMOOTH } from "./tokens";

type SlideSwapProps = {
	activeKey: string | number;
	direction: 1 | -1;
	children: ReactNode;
	className?: string;
};

export function SlideSwap({
	activeKey,
	direction,
	children,
	className,
}: SlideSwapProps) {
	const reduceMotion = useReducedMotion();
	const offset = reduceMotion ? 0 : MOTION_SLIDE_X;

	const variants = {
		enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * offset }),
		center: { opacity: 1, x: 0 },
		exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -offset }),
	};

	const transition = reduceMotion ? { duration: 0 } : MOTION_SPRING_SMOOTH;

	return (
		<AnimatePresence mode="wait" custom={direction} initial={false}>
			<motion.div
				key={activeKey}
				className={className}
				custom={direction}
				variants={variants}
				initial="enter"
				animate="center"
				exit="exit"
				transition={transition}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}
