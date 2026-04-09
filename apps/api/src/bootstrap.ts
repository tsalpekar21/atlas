import { initialize } from "@atlas/logger";
import { env } from "./env.ts";

/**
 * Side-effect module. Importing this runs `initialize()` on the shared
 * logger before any other module that might touch it at load time.
 *
 * Why this exists: several modules (notably `mastra/workflows/background-
 * research.ts`) create child loggers at module scope. ES imports are hoisted,
 * so if `initialize()` lived at the top of `index.ts` alongside
 * `import app from "./app.ts"`, the app import would resolve the workflow
 * file first — and the logger proxy would throw `initialize() must be
 * called before getLogger()`.
 *
 * Import this file at the very top of any entrypoint that loads the Mastra
 * graph, BEFORE any import that can transitively reach `@atlas/logger`.
 */
initialize({
	applicationEnvironment:
		env.NODE_ENV === "production" ? "production" : "development",
});
