import Firecrawl from "@mendable/firecrawl-js";
import type { CrawlJob, SearchData } from "@mendable/firecrawl-js";

const DEFAULT_FIRECRAWL_URL = "http://localhost:3002";

export function createFirecrawlClient(): Firecrawl {
  return new Firecrawl({
    apiKey: process.env.FIRECRAWL_API_KEY ?? "",
    apiUrl: process.env.FIRECRAWL_API_URL ?? DEFAULT_FIRECRAWL_URL,
  });
}

export type SearchDoctorWebsiteInput = {
  query: string;
  limit?: number;
};

export async function searchDoctorWebsite(
  input: SearchDoctorWebsiteInput,
): Promise<{ request: Record<string, unknown>; data: SearchData }> {
  const fc = createFirecrawlClient();
  const limit = input.limit ?? 5;
  const request: Record<string, unknown> = {
    query: input.query,
    limit,
    sources: ["web"],
  };
  const data = await fc.search(input.query, { limit, sources: ["web"] });
  return { request, data };
}

export type CrawlDoctorSiteInput = {
  seedUrl: string;
  pageLimit?: number;
};

export async function crawlDoctorSite(
  input: CrawlDoctorSiteInput,
): Promise<{ request: Record<string, unknown>; job: CrawlJob }> {
  const fc = createFirecrawlClient();
  const limit = input.pageLimit ?? 30;
  const request: Record<string, unknown> = {
    url: input.seedUrl,
    limit,
    scrapeOptions: { formats: ["markdown"] },
  };
  const job = await fc.crawl(input.seedUrl, {
    limit,
    scrapeOptions: { formats: ["markdown"] },
  });
  return { request, job };
}

export function firstWebSearchUrl(data: SearchData): string | null {
  const web = data.web;
  if (!web?.length) return null;
  const first = web[0] as { url?: string };
  return typeof first?.url === "string" ? first.url : null;
}

export function jobToStoredPages(job: CrawlJob): Array<{
  sourceURL?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
}> {
  const docs = job.data ?? [];
  return docs.map((d) => ({
    sourceURL:
      (d.metadata as { sourceURL?: string } | undefined)?.sourceURL ??
      (d.metadata as { url?: string } | undefined)?.url,
    markdown: typeof d.markdown === "string" ? d.markdown : undefined,
    metadata: d.metadata
      ? (JSON.parse(JSON.stringify(d.metadata)) as Record<string, unknown>)
      : undefined,
  }));
}

export function crawlJobSummary(job: CrawlJob): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    completed: job.completed,
    total: job.total,
    creditsUsed: job.creditsUsed,
    expiresAt: job.expiresAt,
  };
}
