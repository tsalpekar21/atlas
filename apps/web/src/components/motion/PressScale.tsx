import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type PressScaleProps = Omit<
	HTMLMotionProps<"div">,
	"whileTap" | "whileHover" | "layout"
> & {
	children: ReactNode;
	tapScale?: number;
	hoverLift?: number;
	layout?: boolean;
};

export function PressScale({
	children,
	tapScale = 0.98,
	hoverLift,
	layout = false,
	...rest
}: PressScaleProps) {
	const reduceMotion = useReducedMotion();

	const whileTap = reduceMotion ? undefined : { scale: tapScale };
	const whileHover =
		reduceMotion || hoverLift === undefined ? undefined : { y: -hoverLift };

	return (
		<motion.div
			whileTap={whileTap}
			whileHover={whileHover}
			layout={reduceMotion ? false : layout}
			{...rest}
		>
			{children}
		</motion.div>
	);
}
