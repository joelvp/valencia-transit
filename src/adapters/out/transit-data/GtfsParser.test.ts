import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { GtfsParser, GtfsParseError, type GtfsData } from "./GtfsParser";
import { LineDirection } from "@/core/domain/line/LineDirection";

const FIXTURES_DIR = path.join(import.meta.dir, "fixtures");

const FIXTURE_FILES = [
  "stops.txt",
  "routes.txt",
  "trips.txt",
  "stop_times.txt",
  "calendar.txt",
  "calendar_dates.txt",
];

function buildZip(files: string[]): string {
  const zip = new AdmZip();
  for (const file of files) {
    zip.addLocalFile(path.join(FIXTURES_DIR, file));
  }
  const tmpPath = path.join(os.tmpdir(), `gtfs-test-${Date.now()}.zip`);
  zip.writeZip(tmpPath);
  return tmpPath;
}

describe("GtfsParser", () => {
  let result: GtfsData;
  let zipPath: string;

  beforeAll(() => {
    zipPath = buildZip(FIXTURE_FILES);
    const parser = new GtfsParser();
    result = parser.parse(zipPath);
  });

  afterAll(() => {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  });

  it("should parse 3 stations", () => {
    expect(result.stations).toHaveLength(3);
  });

  it("should parse station S1 with correct id, name, and location", () => {
    const s1 = result.stations.find((s) => s.id.value === "S1");
    expect(s1).toBeDefined();
    expect(s1!.name.value).toBe("Estació del Nord");
    expect(s1!.location.latitude).toBeCloseTo(39.4699);
    expect(s1!.location.longitude).toBeCloseTo(-0.3763);
  });

  it("should parse 4 lines total (2 routes × 2 directions)", () => {
    expect(result.lines).toHaveLength(4);
  });

  it("should parse line for R1 OUTBOUND with correct direction", () => {
    const line = result.lines.find(
      (l) => l.id.value === "R1__0" && l.direction === LineDirection.OUTBOUND,
    );
    expect(line).toBeDefined();
    expect(line!.direction).toBe(LineDirection.OUTBOUND);
  });

  it("should parse schedule SVC1 with monday=true and saturday=false", () => {
    const svc1 = result.schedules.find((s) => s.id.value === "SVC1");
    expect(svc1).toBeDefined();
    expect(svc1!.weekdays.monday).toBe(true);
    expect(svc1!.weekdays.saturday).toBe(false);
  });

  it("should reformat SVC1 startDate from YYYYMMDD to YYYY-MM-DD", () => {
    const svc1 = result.schedules.find((s) => s.id.value === "SVC1");
    expect(svc1!.dateRange.startDate).toBe("2024-01-01");
  });

  it("should parse SVC1 with 1 exception having isActive=false", () => {
    const svc1 = result.schedules.find((s) => s.id.value === "SVC1");
    expect(svc1!.exceptions).toHaveLength(1);
    expect(svc1!.exceptions[0]!.isActive).toBe(false);
  });

  it("should reformat exception date from YYYYMMDD to YYYY-MM-DD", () => {
    const svc1 = result.schedules.find((s) => s.id.value === "SVC1");
    expect(svc1!.exceptions[0]!.date).toBe("2024-04-15");
  });

  it("should parse exception_type=1 as isActive=true", () => {
    const svc2 = result.schedules.find((s) => s.id.value === "SVC2");
    expect(svc2).toBeDefined();
    expect(svc2!.exceptions).toHaveLength(1);
    expect(svc2!.exceptions[0]!.isActive).toBe(true);
    expect(svc2!.exceptions[0]!.date).toBe("2024-06-01");
  });

  it("should parse 4 trips total", () => {
    expect(result.trips).toHaveLength(4);
  });

  it("should parse trip T1 with OUTBOUND direction", () => {
    const t1 = result.trips.find((t) => t.id.value === "T1");
    expect(t1).toBeDefined();
    expect(t1!.direction).toBe(LineDirection.OUTBOUND);
  });

  it("should parse trip T1 with scheduleId SVC1", () => {
    const t1 = result.trips.find((t) => t.id.value === "T1");
    expect(t1).toBeDefined();
    expect(t1!.scheduleId.value).toBe("SVC1");
  });

  it("should parse trip T1 with 3 passing times", () => {
    const t1 = result.trips.find((t) => t.id.value === "T1");
    expect(t1!.passingTimes).toHaveLength(3);
  });

  it("should parse passing time for T1/S1 with arrivalTime 08:00:00", () => {
    const t1 = result.trips.find((t) => t.id.value === "T1");
    const pt = t1!.passingTimes.find((p) => p.stationId.value === "S1");
    expect(pt).toBeDefined();
    expect(pt!.arrivalTime.value).toBe("08:00:00");
  });

  it("should parse passing time for T1/S1 with departureTime 08:00:30", () => {
    const t1 = result.trips.find((t) => t.id.value === "T1");
    const pt = t1!.passingTimes.find((p) => p.stationId.value === "S1");
    expect(pt).toBeDefined();
    expect(pt!.departureTime.value).toBe("08:00:30");
  });

  it("should throw GtfsParseError when stops.txt is missing", () => {
    const filesWithoutStops = FIXTURE_FILES.filter((f) => f !== "stops.txt");
    const incompleteZipPath = buildZip(filesWithoutStops);
    try {
      const parser = new GtfsParser();
      expect(() => parser.parse(incompleteZipPath)).toThrow(GtfsParseError);
    } finally {
      if (fs.existsSync(incompleteZipPath)) fs.unlinkSync(incompleteZipPath);
    }
  });
});
