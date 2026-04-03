-- Better Auth IDs as native uuid. Requires existing text values to be valid UUID strings
-- (default Better Auth nanoid-style IDs are not); truncate auth tables or reset DB if migrate fails.
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
