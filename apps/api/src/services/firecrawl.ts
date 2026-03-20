import { npiWebSearchHitSchema } from "@atlas/schemas/npi";
import type { CrawlJob, SearchData } from "@mendable/firecrawl-js";
import Firecrawl from "@mendable/firecrawl-js";
import { z } from "zod";

const crawlDocMetadataSchema = z
  .object({
    sourceURL: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

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
  const data = await fc.search(
    `${input.query} -site:npiprofile.com -site:opennpi.com -site:npidb.org -site:npino.com -site:npir.org -site:npidashboard.com`,
    {
      limit,
      sources: ["web"],
      timeout: 30000,
      scrapeOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    },
  );
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
    scrapeOptions: {
      formats: ["markdown"],
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    },
  };
  const job = await fc.crawl(input.seedUrl, {
    limit,
    scrapeOptions: {
      formats: ["markdown"],
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    },
  });
  return { request, job };
}

/** Poll crawl job; onTick receives lightweight status (autoPaginate off). Returns final job with full data. */
export async function crawlDoctorSiteWithProgress(
  input: CrawlDoctorSiteInput,
  onTick: (job: CrawlJob) => void | Promise<void>,
): Promise<CrawlJob> {
  const fc = createFirecrawlClient();
  const limit = input.pageLimit ?? 30;
  const { id } = await fc.startCrawl(input.seedUrl, {
    limit,
    scrapeOptions: { formats: ["markdown"] },
  });
  const pollMs = 2000;
  while (true) {
    const job = await fc.getCrawlStatus(id, { autoPaginate: false });
    await onTick(job);
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      break;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return fc.getCrawlStatus(id);
}

export function firstWebSearchUrl(data: SearchData): string | null {
  const web = data.web;
  if (!web?.length) return null;
  const parsed = npiWebSearchHitSchema.safeParse(web[0]);
  return parsed.success ? parsed.data.url : null;
}

function metadataToRecord(meta: unknown): Record<string, unknown> | undefined {
  if (meta == null) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(JSON.stringify(meta));
  } catch {
    return undefined;
  }
  const rec = z.record(z.string(), z.unknown()).safeParse(raw);
  return rec.success ? rec.data : undefined;
}

function sourceUrlFromDocMetadata(meta: unknown): string | undefined {
  const p = crawlDocMetadataSchema.safeParse(meta);
  if (!p.success) return undefined;
  return p.data.sourceURL ?? p.data.url;
}

export function jobToStoredPages(job: CrawlJob): Array<{
  sourceURL?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
}> {
  const docs = job.data ?? [];
  return docs.map((d) => ({
    sourceURL: sourceUrlFromDocMetadata(d.metadata),
    markdown: typeof d.markdown === "string" ? d.markdown : undefined,
    metadata: metadataToRecord(d.metadata),
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
