import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
	MOTION_DURATION,
	MOTION_EASE,
	MOTION_FADE_Y,
	MOTION_FADE_Y_SM,
} from "./tokens";

type FadeInProps = Omit<
	HTMLMotionProps<"div">,
	"initial" | "animate" | "exit" | "transition"
> & {
	children: ReactNode;
	y?: number;
	duration?: number;
	delay?: number;
	withExit?: boolean;
};

export function FadeIn({
	children,
	y = MOTION_FADE_Y,
	duration = MOTION_DURATION,
	delay,
	withExit = true,
	...rest
}: FadeInProps) {
	const reduceMotion = useReducedMotion();

	const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, y };
	const animate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
	const exit = reduceMotion
		? { opacity: 0 }
		: { opacity: 0, y: -MOTION_FADE_Y_SM };
	const transition = reduceMotion
		? { duration: 0, delay }
		: { duration, delay, ease: MOTION_EASE };

	return (
		<motion.div
			initial={initial}
			animate={animate}
			exit={withExit ? exit : undefined}
			transition={transition}
			{...rest}
		>
			{children}
		</motion.div>
	);
}
