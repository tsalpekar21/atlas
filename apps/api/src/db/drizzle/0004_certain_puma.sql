CREATE TABLE "research_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"chart_hash" text NOT NULL,
	"status" text NOT NULL,
	"brief" jsonb,
	"synthesis" jsonb,
	"evidence_items" jsonb,
	"suggested_questions" jsonb,
	"escalation_flags" jsonb,
	"what_changed" text,
	"error_message" text
);
--> statement-breakpoint
CREATE INDEX "research_findings_thread_created_idx" ON "research_findings" USING btree ("thread_id","created_at");