/** Public web app origin (no trailing slash), e.g. http://localhost:3000 */
const FRONTEND_ORIGIN =
  import.meta.env.VITE_FRONTEND_URL?.replace(/\/$/, "") ?? "";

/**
 * Absolute or same-origin URL to the bot patient triage route.
 */
export function buildPatientTriageHref(opts: {
  threadId: string;
  initialMessage?: string;
}): string {
  const qs = new URLSearchParams({ threadId: opts.threadId });
  if (opts.initialMessage?.trim()) {
    qs.set("initialMessage", opts.initialMessage.trim());
  }
  const path = `/?${qs.toString()}`;
  return FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN}${path}` : path;
}
