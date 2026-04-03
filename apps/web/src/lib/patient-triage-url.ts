/** Base URL for the bot app (no trailing slash), e.g. http://localhost:3001 */
const TRIAGE_ORIGIN =
  import.meta.env.VITE_PATIENT_TRIAGE_ORIGIN?.replace(/\/$/, "") ?? "";

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
  return TRIAGE_ORIGIN ? `${TRIAGE_ORIGIN}${path}` : path;
}
