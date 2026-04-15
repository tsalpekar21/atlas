import * as z from "zod";

/** Shared client env shape for t3-env and optional Vite config validation */
export const webClientEnv = {
	VITE_API_URL: z.string().url(),
	VITE_FRONTEND_URL: z.string().url(),
	VITE_SHOW_DEBUG_SNAPSHOTS: z.string().optional(),
};
