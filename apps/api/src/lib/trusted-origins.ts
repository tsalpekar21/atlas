import { env } from "../env.ts";

/**
 * Origins allowed for CORS + Better Auth `trustedOrigins`.
 * Comma-separated in TRUSTED_ORIGINS or single CORS_ORIGIN; defaults to local web dev.
 */
export function getTrustedOrigins(): Array<string> {
  const raw = env.TRUSTED_ORIGINS ?? env.CORS_ORIGIN ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length > 0) {
    return list;
  }
  return ["http://localhost:3000"];
}
