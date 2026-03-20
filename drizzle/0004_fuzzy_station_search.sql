CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX idx_stations_name_trgm ON stations USING gin (name gin_trgm_ops);
