CREATE TABLE "scraped_websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"root_domain" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scraped_websites_root_domain_unique" UNIQUE("root_domain")
);
--> statement-breakpoint
ALTER TABLE "scraped_pages" ADD COLUMN "scraped_website_id" uuid;--> statement-breakpoint
CREATE INDEX "scraped_websites_root_domain_idx" ON "scraped_websites" USING btree ("root_domain");--> statement-breakpoint
ALTER TABLE "scraped_pages" ADD CONSTRAINT "scraped_pages_scraped_website_id_scraped_websites_id_fk" FOREIGN KEY ("scraped_website_id") REFERENCES "public"."scraped_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scraped_pages_scraped_website_id_idx" ON "scraped_pages" USING btree ("scraped_website_id");