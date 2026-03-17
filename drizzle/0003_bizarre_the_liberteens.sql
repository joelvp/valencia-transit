ALTER TABLE "line_stations" DROP CONSTRAINT "line_stations_line_id_station_id_sequence_direction_feed_id_pk";--> statement-breakpoint
ALTER TABLE "line_stations" ADD CONSTRAINT "line_stations_line_id_station_id_feed_id_pk" PRIMARY KEY("line_id","station_id","feed_id");--> statement-breakpoint
ALTER TABLE "line_stations" DROP COLUMN "direction";--> statement-breakpoint
ALTER TABLE "trips" DROP COLUMN "direction";