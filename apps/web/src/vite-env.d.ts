/// <reference types="vite/client" />

/** Prefer `import { env } from "@/env"` for validated access; this augments Vite’s types. */
interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_FRONTEND_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
