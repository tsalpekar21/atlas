CREATE EXTENSION IF NOT EXISTS "vector";--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scraped_page_id" uuid NOT NULL,
	"scraped_website_id" uuid,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_scraped_page_id_scraped_pages_id_fk" FOREIGN KEY ("scraped_page_id") REFERENCES "public"."scraped_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_scraped_website_id_scraped_websites_id_fk" FOREIGN KEY ("scraped_website_id") REFERENCES "public"."scraped_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_scraped_page_id_idx" ON "chunks" USING btree ("scraped_page_id","chunk_index");--> statement-breakpoint
CREATE INDEX "chunks_scraped_website_id_idx" ON "chunks" USING btree ("scraped_website_id");--> statement-breakpoint
CREATE INDEX "chunks_status_idx" ON "chunks" USING btree ("status");