-- Add line_id to routes table (links operational route to commercial line)
--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "line_id" text;
--> statement-breakpoint
ALTER TABLE "routes" DROP CONSTRAINT IF EXISTS "routes_line_id_feed_id_lines_id_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_line_id_feed_id_lines_id_feed_id_fk" FOREIGN KEY ("line_id","feed_id") REFERENCES "public"."lines"("id","feed_id") ON DELETE set null ON UPDATE no action;
