DROP TABLE "domain_events";
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"occurred_on" timestamp NOT NULL,
	"body" jsonb NOT NULL,
	"aggregate_id" text,
	"aggregate_type" text,
	"trace_id" text
);
