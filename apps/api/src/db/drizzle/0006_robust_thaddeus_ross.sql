CREATE TABLE "scraped_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"markdown" text,
	"metadata" jsonb,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scraped_pages_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE INDEX "scraped_pages_url_idx" ON "scraped_pages" USING btree ("url");