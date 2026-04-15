import { createEnv } from "@t3-oss/env-core";
import { webClientEnv } from "./env-schema.ts";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: webClientEnv,
	runtimeEnvStrict: {
		VITE_API_URL: import.meta.env.VITE_API_URL,
		VITE_FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL,
		VITE_SHOW_DEBUG_SNAPSHOTS: import.meta.env.VITE_SHOW_DEBUG_SNAPSHOTS,
	},
	emptyStringAsUndefined: true,
});
