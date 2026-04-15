// vite.config.ts
import { createEnv } from "@t3-oss/env-core";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { webClientEnv } from "./src/env-schema.ts";

export default defineConfig(({ mode }) => {
	const loaded = loadEnv(mode, process.cwd(), "");
	createEnv({
		clientPrefix: "VITE_",
		client: webClientEnv,
		runtimeEnvStrict: {
			VITE_API_URL: loaded.VITE_API_URL,
			VITE_FRONTEND_URL: loaded.VITE_FRONTEND_URL,
		},
		emptyStringAsUndefined: true,
	});

	return {
		build: {
			rollupOptions: {
				external: ["fsevents"],
			},
		},
		plugins: [
			devtools(),
			nitro({
				rollupConfig: {
					external: [/^@sentry\//],
				},
			}),
			tsconfigPaths({ projects: ["./tsconfig.json"] }),
			tailwindcss(),
			tanstackStart({
				server: { entry: "server" },
			}),
			viteReact({
				babel: {
					plugins: ["babel-plugin-react-compiler"],
				},
			}),
		],
	};
});
