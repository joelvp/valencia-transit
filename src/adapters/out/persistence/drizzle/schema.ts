import {
  pgTable,
  text,
  real,
  boolean,
  date,
  time,
  integer,
  primaryKey,
  foreignKey,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

// Stations and Bus Stops (generalized as 'stations' to match domain aggregate)
export const stations = pgTable(
  "stations",
  {
    id: text("id").notNull(), // GTFS stop_id
    feedId: text("feed_id").notNull(), // 'metrovalencia', 'emt'
    name: text("name").notNull(), // GTFS stop_name
    latitude: real("latitude").notNull(), // GTFS stop_lat
    longitude: real("longitude").notNull(), // GTFS stop_lon
    transportType: text("transport_type").notNull(), // 'metro', 'bus', 'tram', 'train'
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
  }),
);

// Lines (Routes in GTFS)
export const lines = pgTable(
  "lines",
  {
    id: text("id").notNull(), // GTFS route_id
    feedId: text("feed_id").notNull(),
    name: text("name").notNull(), // GTFS route_long_name or route_short_name
    shortName: text("short_name"), // GTFS route_short_name
    transportType: text("transport_type").notNull(), // 'metro', 'bus', 'tram'
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
  }),
);

// Junction table: which lines stop at which stations
export const lineStations = pgTable(
  "line_stations",
  {
    lineId: text("line_id").notNull(),
    stationId: text("station_id").notNull(),
    feedId: text("feed_id").notNull(),
    sequence: integer("sequence").notNull(),
    direction: text("direction").notNull(), // 'OUTBOUND' | 'INBOUND'
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lineId, t.stationId, t.sequence, t.direction, t.feedId] }),
    lineFk: foreignKey({
      columns: [t.lineId, t.feedId],
      foreignColumns: [lines.id, lines.feedId],
    }).onDelete("cascade"),
    stationFk: foreignKey({
      columns: [t.stationId, t.feedId],
      foreignColumns: [stations.id, stations.feedId],
    }).onDelete("cascade"),
  }),
);

// Schedules (Services in GTFS calendar.txt)
export const schedules = pgTable(
  "schedules",
  {
    id: text("id").notNull(), // GTFS service_id
    feedId: text("feed_id").notNull(),
    monday: boolean("monday").notNull(),
    tuesday: boolean("tuesday").notNull(),
    wednesday: boolean("wednesday").notNull(),
    thursday: boolean("thursday").notNull(),
    friday: boolean("friday").notNull(),
    saturday: boolean("saturday").notNull(),
    sunday: boolean("sunday").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
  }),
);

// Schedule Exceptions (calendar_dates.txt)
export const scheduleExceptions = pgTable(
  "schedule_exceptions",
  {
    scheduleId: text("schedule_id").notNull(),
    feedId: text("feed_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    isActive: boolean("is_active").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scheduleId, t.date, t.feedId] }),
    scheduleFk: foreignKey({
      columns: [t.scheduleId, t.feedId],
      foreignColumns: [schedules.id, schedules.feedId],
    }).onDelete("cascade"),
  }),
);

// Trips (trips.txt)
export const trips = pgTable(
  "trips",
  {
    id: text("id").notNull(), // GTFS trip_id
    feedId: text("feed_id").notNull(),
    lineId: text("line_id").notNull(),
    scheduleId: text("schedule_id").notNull(),
    direction: text("direction").notNull(),
    headsign: text("headsign"), // GTFS trip_headsign
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
    lineFk: foreignKey({
      columns: [t.lineId, t.feedId],
      foreignColumns: [lines.id, lines.feedId],
    }).onDelete("cascade"),
    scheduleFk: foreignKey({
      columns: [t.scheduleId, t.feedId],
      foreignColumns: [schedules.id, schedules.feedId],
    }).onDelete("cascade"),
  }),
);

// Passing Times (stop_times.txt)
export const passingTimes = pgTable(
  "passing_times",
  {
    tripId: text("trip_id").notNull(),
    stationId: text("station_id").notNull(),
    feedId: text("feed_id").notNull(),
    arrivalTime: time("arrival_time").notNull(), // GTFS arrival_time
    departureTime: time("departure_time").notNull(), // GTFS departure_time
    sequence: integer("sequence").notNull(), // GTFS stop_sequence
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tripId, t.stationId, t.sequence, t.feedId] }),
    tripFk: foreignKey({
      columns: [t.tripId, t.feedId],
      foreignColumns: [trips.id, trips.feedId],
    }).onDelete("cascade"),
    stationFk: foreignKey({
      columns: [t.stationId, t.feedId],
      foreignColumns: [stations.id, stations.feedId],
    }).onDelete("cascade"),
  }),
);

// Application concern: Dataset versions
export const datasetVersions = pgTable("dataset_versions", {
  id: serial("id").primaryKey(),
  feedId: text("feed_id").notNull(), // 'metrovalencia', 'emt'
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  validityStart: date("validity_start", { mode: "string" }),
  validityEnd: date("validity_end", { mode: "string" }),
  status: text("status").notNull(), // 'success', 'failed'
  errorMessage: text("error_message"),
});

// Application concern: Search logs for analytics
export const searchLogs = pgTable(
  "search_logs",
  {
    id: serial("id").primaryKey(),
    feedId: text("feed_id").notNull(),
    originStationId: text("origin_station_id").notNull(),
    destinationStationId: text("destination_station_id").notNull(),
    searchedAt: timestamp("searched_at").notNull().defaultNow(),
    resultsCount: integer("results_count").notNull(),
  },
  (t) => ({
    originFk: foreignKey({
      columns: [t.originStationId, t.feedId],
      foreignColumns: [stations.id, stations.feedId],
    }),
    destinationFk: foreignKey({
      columns: [t.destinationStationId, t.feedId],
      foreignColumns: [stations.id, stations.feedId],
    }),
  }),
);
