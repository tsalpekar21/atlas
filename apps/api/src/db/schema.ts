import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const npiProviderFetch = pgTable("npi_provider_fetch", {
  npi: text("npi").primaryKey(),
  registryResponse: jsonb("registry_response")
    .$type<Record<string, unknown>>()
    .notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const doctorWebsiteSearch = pgTable(
  "doctor_website_search",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    npi: text("npi")
      .notNull()
      .references(() => npiProviderFetch.npi),
    searchQuery: text("search_query").notNull(),
    firecrawlRequest: jsonb("firecrawl_request")
      .$type<Record<string, unknown>>()
      .notNull(),
    firecrawlResponse: jsonb("firecrawl_response")
      .$type<Record<string, unknown>>()
      .notNull(),
    selectedUrl: text("selected_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("doctor_website_search_npi_idx").on(t.npi)],
);

export const doctorSiteCrawl = pgTable(
  "doctor_site_crawl",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    npi: text("npi").notNull(),
    searchId: uuid("search_id")
      .notNull()
      .references(() => doctorWebsiteSearch.id),
    seedUrl: text("seed_url").notNull(),
    firecrawlJobId: text("firecrawl_job_id"),
    crawlStatusFinal: jsonb("crawl_status_final")
      .$type<Record<string, unknown>>()
      .notNull(),
    pages: jsonb("pages")
      .$type<
        Array<{
          sourceURL?: string;
          markdown?: string;
          metadata?: Record<string, unknown>;
        }>
      >()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("doctor_site_crawl_npi_idx").on(t.npi)],
);
