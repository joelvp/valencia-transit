import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import AdmZip from "adm-zip";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { GtfsParser } from "@/adapters/out/transit-data/GtfsParser";
import { ImportTransitData } from "@/core/application/import/ImportTransitData";
import { createTestSetup } from "@/adapters/out/persistence/drizzle/repositories/test-db-helper";
import {
  stationRepository,
  lineRepository,
  scheduleRepository,
  tripRepository,
  eventBus,
} from "@/adapters/container";

const TEST_FEED_ID = "test-feed";

const { db, cleanDatabase, closeDatabase } = createTestSetup();

/**
 * Creates a minimal valid GTFS ZIP buffer in memory.
 * Contains:
 * - stops.txt: 2 stations
 * - routes.txt: 1 route
 * - trips.txt: 2 trips (one per direction)
 * - stop_times.txt: stop times for trips
 * - calendar.txt: 1 schedule (weekdays)
 * - calendar_dates.txt: empty (no exceptions)
 */
function createMinimalGtfsZip(): Buffer {
  const stopsCsv = [
    "stop_id,stop_name,stop_lat,stop_lon",
    "ST1,Colón,39.4682,-0.3765",
    "ST2,Xàtiva,39.4676,-0.3789",
  ].join("\n");

  const routesCsv = ["route_id,route_short_name,route_long_name,route_type", "L1,1,Línea 1,1"].join(
    "\n",
  );

  const tripsCsv = [
    "route_id,service_id,trip_id,direction_id",
    "L1,weekday,T1,0",
    "L1,weekday,T2,1",
  ].join("\n");

  const stopTimesCsv = [
    "trip_id,stop_id,arrival_time,departure_time,stop_sequence",
    "T1,ST1,06:00:00,06:00:00,1",
    "T1,ST2,06:05:00,06:05:00,2",
    "T2,ST2,06:10:00,06:10:00,1",
    "T2,ST1,06:15:00,06:15:00,2",
  ].join("\n");

  const calendarCsv = [
    "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
    "weekday,1,1,1,1,1,0,0,20240101,20241231",
  ].join("\n");

  const calendarDatesCsv = "service_id,date,exception_type";

  const zip = new AdmZip();
  zip.addFile("stops.txt", Buffer.from(stopsCsv, "utf-8"));
  zip.addFile("routes.txt", Buffer.from(routesCsv, "utf-8"));
  zip.addFile("trips.txt", Buffer.from(tripsCsv, "utf-8"));
  zip.addFile("stop_times.txt", Buffer.from(stopTimesCsv, "utf-8"));
  zip.addFile("calendar.txt", Buffer.from(calendarCsv, "utf-8"));
  zip.addFile("calendar_dates.txt", Buffer.from(calendarDatesCsv, "utf-8"));

  return zip.toBuffer();
}

describe("GTFS Import Technical Test", () => {
  let zipBuffer: Buffer;

  beforeEach(async () => {
    await cleanDatabase();
    zipBuffer = createMinimalGtfsZip();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should parse GTFS ZIP and return valid data structure", () => {
    const parser = new GtfsParser();

    // Write zip to temp file since AdmZip requires a file path
    const tempPath = join(tmpdir(), "test-gtfs.zip");
    writeFileSync(tempPath, zipBuffer);

    const gtfsData = parser.parse(tempPath);

    expect(gtfsData.stations).toHaveLength(2);
    expect(gtfsData.lines).toHaveLength(2); // 1 route × 2 directions
    expect(gtfsData.schedules).toHaveLength(1);
    expect(gtfsData.trips).toHaveLength(2);

    // Clean up temp file
    unlinkSync(tempPath);
  });

  it("should import GTFS data into database without errors", async () => {
    const parser = new GtfsParser();

    // Write zip to temp file
    const tempPath = join(tmpdir(), "test-gtfs-import.zip");
    writeFileSync(tempPath, zipBuffer);

    // Parse
    const gtfsData = parser.parse(tempPath);

    // Import using real use case (no mocks)
    const importUseCase = new ImportTransitData(
      stationRepository,
      lineRepository,
      scheduleRepository,
      tripRepository,
      eventBus,
    );

    const summary = await importUseCase.execute(gtfsData, TEST_FEED_ID);

    // Verify summary structure
    expect(summary).toHaveProperty("feedId");
    expect(summary).toHaveProperty("stationsImported");
    expect(summary).toHaveProperty("linesImported");
    expect(summary).toHaveProperty("schedulesImported");
    expect(summary).toHaveProperty("tripsImported");

    // Verify data counts
    expect(summary.feedId).toBe(TEST_FEED_ID);
    expect(summary.stationsImported).toBeGreaterThan(0);
    expect(summary.linesImported).toBeGreaterThan(0);
    expect(summary.schedulesImported).toBeGreaterThan(0);
    expect(summary.tripsImported).toBeGreaterThan(0);

    // Verify actual counts match expected
    expect(summary.stationsImported).toBe(2);
    expect(summary.linesImported).toBe(2);
    expect(summary.schedulesImported).toBe(1);
    expect(summary.tripsImported).toBe(2);

    // Clean up temp file
    unlinkSync(tempPath);
  });

  it("should replace existing data when re-importing same feed", async () => {
    const parser = new GtfsParser();
    const tempPath = join(tmpdir(), "test-gtfs-reimport.zip");
    writeFileSync(tempPath, zipBuffer);

    const gtfsData = parser.parse(tempPath);
    const importUseCase = new ImportTransitData(
      stationRepository,
      lineRepository,
      scheduleRepository,
      tripRepository,
      eventBus,
    );

    // First import
    const summary1 = await importUseCase.execute(gtfsData, TEST_FEED_ID);
    expect(summary1.stationsImported).toBe(2);

    // Re-import same data
    const summary2 = await importUseCase.execute(gtfsData, TEST_FEED_ID);
    expect(summary2.stationsImported).toBe(2);

    // Should not duplicate - count should remain the same
    const stations = await stationRepository.findAll();
    expect(stations.length).toBe(2);

    unlinkSync(tempPath);
  });
});
