import type { HTMLMotionProps, Variants } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION_FADE_Y_LG, MOTION_SPRING_SNAPPY } from "./tokens";

type FadeStackProps = Omit<
	HTMLMotionProps<"div">,
	"initial" | "animate" | "variants"
> & {
	children: ReactNode;
	stagger?: number;
	initialDelay?: number;
};

export function FadeStack({
	children,
	stagger = 0.08,
	initialDelay = 0.06,
	...rest
}: FadeStackProps) {
	const reduceMotion = useReducedMotion();

	const variants: Variants = {
		hidden: {},
		show: {
			transition: reduceMotion
				? { duration: 0 }
				: { staggerChildren: stagger, delayChildren: initialDelay },
		},
	};

	return (
		<motion.div variants={variants} initial="hidden" animate="show" {...rest}>
			{children}
		</motion.div>
	);
}

type FadeStackItemProps = Omit<
	HTMLMotionProps<"div">,
	"initial" | "animate" | "variants"
> & {
	children: ReactNode;
	y?: number;
};

function FadeStackItem({
	children,
	y = MOTION_FADE_Y_LG,
	...rest
}: FadeStackItemProps) {
	const reduceMotion = useReducedMotion();

	const variants: Variants = {
		hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y },
		show: reduceMotion
			? { opacity: 1, y: 0 }
			: { opacity: 1, y: 0, transition: MOTION_SPRING_SNAPPY },
	};

	return (
		<motion.div variants={variants} {...rest}>
			{children}
		</motion.div>
	);
}

FadeStack.Item = FadeStackItem;
