-- Route/Line schema refactor
-- Old: lines table stored GTFS route_id-based data, trips.line_id referenced lines
-- New: routes table (per GTFS route_id) + lines table (commercial, keyed by route_short_name)
--      trips.route_id references routes; line_stations PK simplified (no direction/sequence in PK)
--
-- Import is idempotent (truncate+re-insert), so data loss is acceptable.

--> statement-breakpoint
-- 1. Drop all FKs before restructuring
ALTER TABLE "passing_times" DROP CONSTRAINT IF EXISTS "passing_times_trip_id_feed_id_trips_id_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "passing_times" DROP CONSTRAINT IF EXISTS "passing_times_station_id_feed_id_stations_id_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "line_stations" DROP CONSTRAINT IF EXISTS "line_stations_line_id_feed_id_lines_id_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "line_stations" DROP CONSTRAINT IF EXISTS "line_stations_station_id_feed_id_stations_id_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "trips_line_id_feed_id_lines_id_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "trips_schedule_id_feed_id_schedules_id_feed_id_fk";

--> statement-breakpoint
-- 2. Drop old composite PKs that will change structure
ALTER TABLE "line_stations" DROP CONSTRAINT IF EXISTS "line_stations_line_id_station_id_sequence_direction_feed_id_pk";

--> statement-breakpoint
-- 3. Truncate all dependent tables (FK-safe order)
TRUNCATE TABLE "passing_times";
--> statement-breakpoint
TRUNCATE TABLE "line_stations";
--> statement-breakpoint
TRUNCATE TABLE "trips";
--> statement-breakpoint
TRUNCATE TABLE "lines";

--> statement-breakpoint
-- 4. Alter lines: drop short_name (id now means route_short_name, not route_id)
ALTER TABLE "lines" DROP COLUMN IF EXISTS "short_name";

--> statement-breakpoint
-- 5. Alter line_stations: drop direction column (PK already simplified in 0003)
ALTER TABLE "line_stations" DROP COLUMN IF EXISTS "direction";

--> statement-breakpoint
-- 6. Alter trips: rename line_id → route_id, drop direction column
ALTER TABLE "trips" DROP COLUMN IF EXISTS "direction";
--> statement-breakpoint
ALTER TABLE "trips" RENAME COLUMN "line_id" TO "route_id";

--> statement-breakpoint
-- 7. Create routes table (operational unit, one per GTFS route_id)
CREATE TABLE IF NOT EXISTS "routes" (
  "id" text NOT NULL,
  "feed_id" text NOT NULL,
  "transport_type" text NOT NULL,
  CONSTRAINT "routes_id_feed_id_pk" PRIMARY KEY ("id", "feed_id")
);

--> statement-breakpoint
-- 8. Create route_stations junction table (unordered station set per route)
CREATE TABLE IF NOT EXISTS "route_stations" (
  "route_id" text NOT NULL,
  "station_id" text NOT NULL,
  "feed_id" text NOT NULL,
  CONSTRAINT "route_stations_route_id_station_id_feed_id_pk" PRIMARY KEY ("route_id", "station_id", "feed_id")
);

--> statement-breakpoint
-- 9. FKs for route_stations
ALTER TABLE "route_stations" ADD CONSTRAINT "route_stations_route_id_feed_id_routes_id_feed_id_fk"
  FOREIGN KEY ("route_id", "feed_id") REFERENCES "routes"("id", "feed_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "route_stations" ADD CONSTRAINT "route_stations_station_id_feed_id_stations_id_feed_id_fk"
  FOREIGN KEY ("station_id", "feed_id") REFERENCES "stations"("id", "feed_id") ON DELETE CASCADE;

--> statement-breakpoint
-- 10. FKs for trips (now pointing to routes)
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_feed_id_routes_id_feed_id_fk"
  FOREIGN KEY ("route_id", "feed_id") REFERENCES "routes"("id", "feed_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_schedule_id_feed_id_schedules_id_feed_id_fk"
  FOREIGN KEY ("schedule_id", "feed_id") REFERENCES "schedules"("id", "feed_id") ON DELETE CASCADE;

--> statement-breakpoint
-- 11. FKs for line_stations (pointing to new lines structure)
ALTER TABLE "line_stations" ADD CONSTRAINT "line_stations_line_id_feed_id_lines_id_feed_id_fk"
  FOREIGN KEY ("line_id", "feed_id") REFERENCES "lines"("id", "feed_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "line_stations" ADD CONSTRAINT "line_stations_station_id_feed_id_stations_id_feed_id_fk"
  FOREIGN KEY ("station_id", "feed_id") REFERENCES "stations"("id", "feed_id") ON DELETE CASCADE;

--> statement-breakpoint
-- 12. FKs for passing_times
ALTER TABLE "passing_times" ADD CONSTRAINT "passing_times_trip_id_feed_id_trips_id_feed_id_fk"
  FOREIGN KEY ("trip_id", "feed_id") REFERENCES "trips"("id", "feed_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "passing_times" ADD CONSTRAINT "passing_times_station_id_feed_id_stations_id_feed_id_fk"
  FOREIGN KEY ("station_id", "feed_id") REFERENCES "stations"("id", "feed_id") ON DELETE CASCADE;
