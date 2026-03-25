import {
  pgTable,
  text,
  real,
  boolean,
  date,
  integer,
  primaryKey,
  foreignKey,
  serial,
  timestamp,
  jsonb,
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
    transportTypes: text("transport_types").array(), // nullable — populated by post-process after import
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
  }),
);

// Lines (commercial line the traveler sees — keyed by route_short_name)
export const lines = pgTable(
  "lines",
  {
    id: text("id").notNull(), // route_short_name ("4", "1")
    feedId: text("feed_id").notNull(),
    name: text("name").notNull(), // "Línia 4"
    color: text("color"), // hardcoded hex, no #
    transportType: text("transport_type").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
  }),
);

// Junction table: which lines stop at which stations (ordered)
export const lineStations = pgTable(
  "line_stations",
  {
    lineId: text("line_id").notNull(),
    stationId: text("station_id").notNull(),
    feedId: text("feed_id").notNull(),
    sequence: integer("sequence").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lineId, t.stationId, t.feedId] }),
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

// Routes (operational unit — one per GTFS route_id)
export const routes = pgTable(
  "routes",
  {
    id: text("id").notNull(), // GTFS route_id ("V4-114-98")
    feedId: text("feed_id").notNull(),
    transportType: text("transport_type").notNull(),
    lineId: text("line_id"), // route_short_name → FK to lines
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
    lineFk: foreignKey({
      columns: [t.lineId, t.feedId],
      foreignColumns: [lines.id, lines.feedId],
    }).onDelete("set null"),
  }),
);

// Junction table: which stations belong to which route (unordered)
export const routeStations = pgTable(
  "route_stations",
  {
    routeId: text("route_id").notNull(),
    stationId: text("station_id").notNull(),
    feedId: text("feed_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.routeId, t.stationId, t.feedId] }),
    routeFk: foreignKey({
      columns: [t.routeId, t.feedId],
      foreignColumns: [routes.id, routes.feedId],
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

// Trips (trips.txt) — reference route_id, not line_id
export const trips = pgTable(
  "trips",
  {
    id: text("id").notNull(), // GTFS trip_id
    feedId: text("feed_id").notNull(),
    routeId: text("route_id").notNull(),
    scheduleId: text("schedule_id").notNull(),
    headsign: text("headsign"), // GTFS trip_headsign
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.feedId] }),
    routeFk: foreignKey({
      columns: [t.routeId, t.feedId],
      foreignColumns: [routes.id, routes.feedId],
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
    arrivalTime: text("arrival_time").notNull(), // GTFS arrival_time (HH:MM:SS, hours can exceed 23)
    departureTime: text("departure_time").notNull(), // GTFS departure_time (HH:MM:SS, hours can exceed 23)
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

// Event Store: append-only log of all domain events
export const domainEvents = pgTable("domain_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  occurredOn: timestamp("occurred_on").notNull(),
  body: jsonb("body").notNull(),
  aggregateId: text("aggregate_id"),
  aggregateType: text("aggregate_type"),
  traceId: text("trace_id"),
});
