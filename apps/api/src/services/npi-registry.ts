import {
  isNppesRegistryError,
  parseNppesRegistryResponse,
  type NppesRegistryApiSuccess,
} from "@atlas/schemas/npi";

const NPI_REGISTRY_BASE = "https://npiregistry.cms.hhs.gov/api/";

export function normalizeNpi(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

export async function fetchNpiByNumber(
  npi: string,
): Promise<NppesRegistryApiSuccess> {
  const url = new URL(NPI_REGISTRY_BASE);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("number", npi);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`NPI registry HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  const parsed = parseNppesRegistryResponse(json);
  if (isNppesRegistryError(parsed)) {
    const msg = parsed.Errors.map(
      (e) => e.description ?? JSON.stringify(e),
    ).join("; ");
    throw new Error(msg || "NPPES API error");
  }
  return parsed;
}

/**
 * Builds a Firecrawl search string that always prefers an identifiable provider name:
 * NPI-1: individual name + credential; NPI-2: authorized official + org, or org, or AO alone.
 */
export function buildWebsiteSearchQuery(
  registryJson: NppesRegistryApiSuccess,
): string | null {
  const results = registryJson.results;
  if (!results?.length) return null;
  const r = results[0];
  const basic = r.basic ?? {};

  const individualName = [
    basic.prefix,
    basic.first_name,
    basic.middle_name,
    basic.last_name,
    basic.suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const cred = basic.credential?.trim();
  const orgName = (basic.organization_name ?? "").trim();
  const aoName = [
    basic.authorized_official_first_name,
    basic.authorized_official_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const aoCred = (basic.authorized_official_credential ?? "").trim();
  const aoWithCred = [aoName, aoCred].filter(Boolean).join(" ").trim();

  let providerName = "";
  if (individualName) {
    providerName = [individualName, cred].filter(Boolean).join(" ").trim();
  } else if (aoWithCred && orgName) {
    providerName = `${aoWithCred} ${orgName}`;
  } else {
    providerName = orgName || aoWithCred;
  }

  const loc =
    (r.addresses ?? []).find((a) => a.address_purpose === "LOCATION") ??
    r.addresses?.[0];
  const city = loc?.city?.trim() ?? "";
  const state = loc?.state?.trim() ?? "";
  const parts = [
    providerName,
    [city, state].filter(Boolean).join(", "),
    "website",
  ].filter((p) => p.length > 0);
  return parts.length ? parts.join(" ") : null;
}

export function registryResultCount(
  registryJson: NppesRegistryApiSuccess,
): number {
  return registryJson.result_count;
}

export { parseNppesRegistryResponse };
