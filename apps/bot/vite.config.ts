// vite.config.ts
import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["fsevents"],
    },
  },
  plugins: [
    devtools(),
    nitro({
      preset: "vercel",
      vercel: {
        functions: {
          runtime: "nodejs22.x",
        },
      },
      rollupConfig: {
        external: [/^@sentry\//, /^@mastra\//],
      },
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});
