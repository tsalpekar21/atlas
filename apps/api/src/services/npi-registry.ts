const NPI_REGISTRY_BASE = "https://npiregistry.cms.hhs.gov/api/";

export function normalizeNpi(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

export async function fetchNpiByNumber(
  npi: string,
): Promise<Record<string, unknown>> {
  const url = new URL(NPI_REGISTRY_BASE);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("number", npi);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`NPI registry HTTP ${res.status}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

type NpiResult = {
  basic?: {
    prefix?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    credential?: string;
  };
  taxonomies?: Array<{ desc?: string; primary?: boolean }>;
  addresses?: Array<{
    address_purpose?: string;
    city?: string;
    state?: string;
  }>;
};

export function buildWebsiteSearchQuery(
  registryJson: Record<string, unknown>,
): string | null {
  const results = registryJson.results as NpiResult[] | undefined;
  if (!results?.length) return null;
  const r = results[0];
  const basic = r.basic ?? {};
  const name = [
    basic.prefix,
    basic.first_name,
    basic.middle_name,
    basic.last_name,
    basic.suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const cred = basic.credential?.trim();
  const tax =
    (r.taxonomies ?? []).find((t) => t.primary) ?? r.taxonomies?.[0];
  const taxDesc = tax?.desc?.trim() ?? "";
  const loc =
    (r.addresses ?? []).find((a) => a.address_purpose === "LOCATION") ??
    r.addresses?.[0];
  const city = loc?.city?.trim() ?? "";
  const state = loc?.state?.trim() ?? "";
  const parts = [
    [name, cred].filter(Boolean).join(" ").trim(),
    taxDesc,
    [city, state].filter(Boolean).join(", "),
    "medical practice website",
  ].filter((p) => p.length > 0);
  return parts.length ? parts.join(" ") : null;
}

export function registryResultCount(registryJson: Record<string, unknown>): number {
  const n = registryJson.result_count;
  return typeof n === "number" ? n : 0;
}
