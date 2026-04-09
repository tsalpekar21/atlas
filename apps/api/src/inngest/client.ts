import { Inngest } from "inngest";
import { env } from "../env.ts";

/**
 * Single Inngest client shared by the API server.
 *
 * In development Inngest runs against the local `inngest-cli dev` devserver
 * (started by the `@atlas/inngest-dev` workspace). In production the signing
 * + event keys are picked up from the environment by the Inngest SDK.
 *
 * Realtime step status (for the UI indicator) is published over an
 * in-process `EventEmitter` bus (`./realtime-bus.ts`) rather than Inngest
 * realtime channels — the workflow executes in the same Node process as the
 * Hono SSE route, so the simpler bus is sufficient for now.
 */
export const inngest = new Inngest({
	id: "atlas",
	isDev: env.NODE_ENV !== "production",
});
