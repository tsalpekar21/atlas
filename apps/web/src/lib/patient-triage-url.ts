import { env } from "@/env";

/** Public web app origin (no trailing slash), e.g. http://localhost:3000 */
const FRONTEND_ORIGIN = env.VITE_FRONTEND_URL?.replace(/\/$/, "") ?? "";

/**
 * Absolute or same-origin URL to the patient triage chat route.
 */
export function buildPatientTriageHref(opts: {
	threadId: string;
	initialMessage?: string;
}): string {
	const path = `/chat/${encodeURIComponent(opts.threadId)}`;
	const qs = new URLSearchParams();
	if (opts.initialMessage?.trim()) {
		qs.set("initialMessage", opts.initialMessage.trim());
	}
	const query = qs.toString();
	const fullPath = query ? `${path}?${query}` : path;
	return FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN}${fullPath}` : fullPath;
}
