CREATE INDEX "idx_passing_times_station_departure" ON "passing_times" USING btree ("station_id","departure_time");--> statement-breakpoint
CREATE INDEX "idx_passing_times_trip_id" ON "passing_times" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "idx_trips_schedule_id" ON "trips" USING btree ("schedule_id");