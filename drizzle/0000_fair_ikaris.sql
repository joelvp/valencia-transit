CREATE TABLE "dataset_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" text NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"validity_start" date,
	"validity_end" date,
	"status" text NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "line_stations" (
	"line_id" text NOT NULL,
	"station_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"direction" text NOT NULL,
	CONSTRAINT "line_stations_line_id_station_id_sequence_direction_feed_id_pk" PRIMARY KEY("line_id","station_id","sequence","direction","feed_id")
);
--> statement-breakpoint
CREATE TABLE "lines" (
	"id" text NOT NULL,
	"feed_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"transport_type" text NOT NULL,
	CONSTRAINT "lines_id_feed_id_pk" PRIMARY KEY("id","feed_id")
);
--> statement-breakpoint
CREATE TABLE "passing_times" (
	"trip_id" text NOT NULL,
	"station_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"arrival_time" time NOT NULL,
	"departure_time" time NOT NULL,
	"sequence" integer NOT NULL,
	CONSTRAINT "passing_times_trip_id_station_id_sequence_feed_id_pk" PRIMARY KEY("trip_id","station_id","sequence","feed_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"schedule_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"date" date NOT NULL,
	"is_active" boolean NOT NULL,
	CONSTRAINT "schedule_exceptions_schedule_id_date_feed_id_pk" PRIMARY KEY("schedule_id","date","feed_id")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text NOT NULL,
	"feed_id" text NOT NULL,
	"monday" boolean NOT NULL,
	"tuesday" boolean NOT NULL,
	"wednesday" boolean NOT NULL,
	"thursday" boolean NOT NULL,
	"friday" boolean NOT NULL,
	"saturday" boolean NOT NULL,
	"sunday" boolean NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	CONSTRAINT "schedules_id_feed_id_pk" PRIMARY KEY("id","feed_id")
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" text NOT NULL,
	"origin_station_id" text NOT NULL,
	"destination_station_id" text NOT NULL,
	"searched_at" timestamp DEFAULT now() NOT NULL,
	"results_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" text NOT NULL,
	"feed_id" text NOT NULL,
	"name" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"transport_type" text NOT NULL,
	CONSTRAINT "stations_id_feed_id_pk" PRIMARY KEY("id","feed_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text NOT NULL,
	"feed_id" text NOT NULL,
	"line_id" text NOT NULL,
	"schedule_id" text NOT NULL,
	"direction" text NOT NULL,
	"headsign" text,
	CONSTRAINT "trips_id_feed_id_pk" PRIMARY KEY("id","feed_id")
);
--> statement-breakpoint
ALTER TABLE "line_stations" ADD CONSTRAINT "line_stations_line_id_feed_id_lines_id_feed_id_fk" FOREIGN KEY ("line_id","feed_id") REFERENCES "public"."lines"("id","feed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_stations" ADD CONSTRAINT "line_stations_station_id_feed_id_stations_id_feed_id_fk" FOREIGN KEY ("station_id","feed_id") REFERENCES "public"."stations"("id","feed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passing_times" ADD CONSTRAINT "passing_times_trip_id_feed_id_trips_id_feed_id_fk" FOREIGN KEY ("trip_id","feed_id") REFERENCES "public"."trips"("id","feed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passing_times" ADD CONSTRAINT "passing_times_station_id_feed_id_stations_id_feed_id_fk" FOREIGN KEY ("station_id","feed_id") REFERENCES "public"."stations"("id","feed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_schedule_id_feed_id_schedules_id_feed_id_fk" FOREIGN KEY ("schedule_id","feed_id") REFERENCES "public"."schedules"("id","feed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_origin_station_id_feed_id_stations_id_feed_id_fk" FOREIGN KEY ("origin_station_id","feed_id") REFERENCES "public"."stations"("id","feed_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_destination_station_id_feed_id_stations_id_feed_id_fk" FOREIGN KEY ("destination_station_id","feed_id") REFERENCES "public"."stations"("id","feed_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_line_id_feed_id_lines_id_feed_id_fk" FOREIGN KEY ("line_id","feed_id") REFERENCES "public"."lines"("id","feed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_schedule_id_feed_id_schedules_id_feed_id_fk" FOREIGN KEY ("schedule_id","feed_id") REFERENCES "public"."schedules"("id","feed_id") ON DELETE cascade ON UPDATE no action;