import { db } from "../db/index.ts";
import {
  doctorSiteCrawl,
  doctorWebsiteSearch,
  npiProviderFetch,
} from "../db/schema.ts";
import {
  crawlDoctorSite,
  crawlJobSummary,
  firstWebSearchUrl,
  jobToStoredPages,
  searchDoctorWebsite,
} from "./firecrawl.ts";
import {
  buildWebsiteSearchQuery,
  fetchNpiByNumber,
  normalizeNpi,
  registryResultCount,
} from "./npi-registry.ts";

export type EnrichmentStep =
  | "npi_fetched"
  | "search_stored"
  | "crawl_stored"
  | "skipped_no_registry"
  | "skipped_no_query"
  | "skipped_no_search_url";

export type EnrichmentResult = {
  npi: string;
  steps: EnrichmentStep[];
  error?: string;
  searchId?: string;
  crawlId?: string;
  selectedUrl?: string | null;
};

function asJsonRecord(v: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
  } catch {
    return { _serializationError: true };
  }
}

export async function enrichDoctorByNpi(rawNpi: string): Promise<EnrichmentResult> {
  const steps: EnrichmentStep[] = [];
  const npi = normalizeNpi(rawNpi);
  if (!npi) {
    return {
      npi: rawNpi,
      steps,
      error: "invalid_npi",
    };
  }

  let registry: Record<string, unknown>;
  try {
    registry = await fetchNpiByNumber(npi);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .insert(npiProviderFetch)
      .values({
        npi,
        registryResponse: { error: message, fetchFailed: true },
      })
      .onConflictDoUpdate({
        target: npiProviderFetch.npi,
        set: {
          registryResponse: { error: message, fetchFailed: true },
          fetchedAt: new Date(),
        },
      });
    return { npi, steps, error: `npi_fetch: ${message}` };
  }

  await db
    .insert(npiProviderFetch)
    .values({ npi, registryResponse: registry })
    .onConflictDoUpdate({
      target: npiProviderFetch.npi,
      set: { registryResponse: registry, fetchedAt: new Date() },
    });
  steps.push("npi_fetched");

  if (registryResultCount(registry) === 0) {
    steps.push("skipped_no_registry");
    return { npi, steps };
  }

  const searchQuery = buildWebsiteSearchQuery(registry);
  if (!searchQuery) {
    steps.push("skipped_no_query");
    const [row] = await db
      .insert(doctorWebsiteSearch)
      .values({
        npi,
        searchQuery: "",
        firecrawlRequest: { skipped: true, reason: "empty_query" },
        firecrawlResponse: {},
        selectedUrl: null,
      })
      .returning({ id: doctorWebsiteSearch.id });
    return {
      npi,
      steps,
      searchId: row?.id,
    };
  }

  let searchId: string;
  let selectedUrl: string | null = null;

  try {
    const { request, data } = await searchDoctorWebsite({
      query: searchQuery,
      limit: 5,
    });
    selectedUrl = firstWebSearchUrl(data);
    const [row] = await db
      .insert(doctorWebsiteSearch)
      .values({
        npi,
        searchQuery,
        firecrawlRequest: request,
        firecrawlResponse: asJsonRecord(data),
        selectedUrl,
      })
      .returning({ id: doctorWebsiteSearch.id });
    searchId = row.id;
    steps.push("search_stored");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const [row] = await db
      .insert(doctorWebsiteSearch)
      .values({
        npi,
        searchQuery,
        firecrawlRequest: { query: searchQuery, limit: 5, sources: ["web"] },
        firecrawlResponse: { error: message },
        selectedUrl: null,
      })
      .returning({ id: doctorWebsiteSearch.id });
    searchId = row.id;
    steps.push("search_stored");
    return {
      npi,
      steps,
      error: `firecrawl_search: ${message}`,
      searchId,
      selectedUrl: null,
    };
  }

  if (!selectedUrl) {
    steps.push("skipped_no_search_url");
    return { npi, steps, searchId, selectedUrl: null };
  }

  try {
    const { job } = await crawlDoctorSite({
      seedUrl: selectedUrl,
      pageLimit: 30,
    });
    const [crawlRow] = await db
      .insert(doctorSiteCrawl)
      .values({
        npi,
        searchId,
        seedUrl: selectedUrl,
        firecrawlJobId: job.id,
        crawlStatusFinal: asJsonRecord(crawlJobSummary(job)),
        pages: jobToStoredPages(job),
      })
      .returning({ id: doctorSiteCrawl.id });
    steps.push("crawl_stored");
    return {
      npi,
      steps,
      searchId,
      crawlId: crawlRow.id,
      selectedUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const [crawlRow] = await db
      .insert(doctorSiteCrawl)
      .values({
        npi,
        searchId,
        seedUrl: selectedUrl,
        firecrawlJobId: null,
        crawlStatusFinal: { error: message, status: "failed" },
        pages: [],
      })
      .returning({ id: doctorSiteCrawl.id });
    steps.push("crawl_stored");
    return {
      npi,
      steps,
      error: `firecrawl_crawl: ${message}`,
      searchId,
      crawlId: crawlRow.id,
      selectedUrl,
    };
  }
}

export async function enrichDoctorsByNpis(
  npis: string[],
): Promise<EnrichmentResult[]> {
  const out: EnrichmentResult[] = [];
  for (const n of npis) {
    out.push(await enrichDoctorByNpi(n));
  }
  return out;
}
