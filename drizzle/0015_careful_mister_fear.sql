CREATE TABLE "fgv_station_ids" (
	"station_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"fgv_station_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fgv_station_ids_station_id_feed_id_pk" PRIMARY KEY("station_id","feed_id")
);
