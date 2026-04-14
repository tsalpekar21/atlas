export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;
export const MOTION_DURATION = 0.35;
export const MOTION_DURATION_FAST = 0.25;
export const MOTION_FADE_Y = 8;
export const MOTION_FADE_Y_SM = 4;
export const MOTION_FADE_Y_LG = 14;
export const MOTION_SLIDE_X = 24;

export const MOTION_SPRING_SNAPPY = {
	type: "spring" as const,
	stiffness: 380,
	damping: 28,
};

export const MOTION_SPRING_SMOOTH = {
	type: "spring" as const,
	stiffness: 320,
	damping: 32,
	mass: 0.9,
};
