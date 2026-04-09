CREATE TABLE "message_debug_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"working_memory" text,
	"research_round_id" uuid,
	CONSTRAINT "message_debug_snapshots_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
ALTER TABLE "message_debug_snapshots" ADD CONSTRAINT "message_debug_snapshots_research_round_id_research_findings_id_fk" FOREIGN KEY ("research_round_id") REFERENCES "public"."research_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_debug_thread_created_idx" ON "message_debug_snapshots" USING btree ("thread_id","created_at");