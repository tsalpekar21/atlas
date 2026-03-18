CREATE TABLE "doctor_site_crawl" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"npi" text NOT NULL,
	"search_id" uuid NOT NULL,
	"seed_url" text NOT NULL,
	"firecrawl_job_id" text,
	"crawl_status_final" jsonb NOT NULL,
	"pages" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_website_search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"npi" text NOT NULL,
	"search_query" text NOT NULL,
	"firecrawl_request" jsonb NOT NULL,
	"firecrawl_response" jsonb NOT NULL,
	"selected_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npi_provider_fetch" (
	"npi" text PRIMARY KEY NOT NULL,
	"registry_response" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctor_site_crawl" ADD CONSTRAINT "doctor_site_crawl_search_id_doctor_website_search_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."doctor_website_search"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_website_search" ADD CONSTRAINT "doctor_website_search_npi_npi_provider_fetch_npi_fk" FOREIGN KEY ("npi") REFERENCES "public"."npi_provider_fetch"("npi") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doctor_site_crawl_npi_idx" ON "doctor_site_crawl" USING btree ("npi");--> statement-breakpoint
CREATE INDEX "doctor_website_search_npi_idx" ON "doctor_website_search" USING btree ("npi");