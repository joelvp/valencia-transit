import AdmZip from "adm-zip";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineDirection } from "@/core/domain/line/LineDirection";
import { LineStop } from "@/core/domain/line/LineStop";
import { StationId } from "@/core/domain/station/StationId";
import { Schedule } from "@/core/domain/schedule/Schedule";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";
import { ScheduleException } from "@/core/domain/schedule/ScheduleException";
import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { PassingTime } from "@/core/domain/trip/PassingTime";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

export interface GtfsData {
  stations: Station[];
  lines: Line[];
  schedules: Schedule[];
  trips: Trip[];
}

const REQUIRED_FILES = [
  "stops.txt",
  "routes.txt",
  "trips.txt",
  "stop_times.txt",
  "calendar.txt",
  "calendar_dates.txt",
] as const;

export class GtfsParseError extends Error {
  readonly code = "GTFS_PARSE_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "GtfsParseError";
  }
}

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0]!.split(",").map((h) => h.trim().replace(/^\uFEFF/, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const values = nonEmpty[i]!.split(",");
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function reformatDate(gtfsDate: string): string {
  // YYYYMMDD → YYYY-MM-DD
  return `${gtfsDate.slice(0, 4)}-${gtfsDate.slice(4, 6)}-${gtfsDate.slice(6, 8)}`;
}

function parseDirection(directionId: string): LineDirection {
  return directionId === "1" ? LineDirection.INBOUND : LineDirection.OUTBOUND;
}

export class GtfsParser {
  parse(zipPath: string): GtfsData {
    const zip = new AdmZip(zipPath);

    // Validate required files
    const entryNames = zip.getEntries().map((e) => e.entryName);
    for (const required of REQUIRED_FILES) {
      if (!entryNames.includes(required)) {
        throw new GtfsParseError(`Missing required GTFS file: ${required}`);
      }
    }

    const getText = (name: string): string => zip.readAsText(name);

    const stations = this.parseStations(parseCsv(getText("stops.txt")));
    const schedules = this.parseSchedules(
      parseCsv(getText("calendar.txt")),
      parseCsv(getText("calendar_dates.txt")),
    );
    const stopTimesRows = parseCsv(getText("stop_times.txt"));
    const lines = this.parseLines(
      parseCsv(getText("routes.txt")),
      parseCsv(getText("trips.txt")),
      stopTimesRows,
    );
    const trips = this.parseTrips(parseCsv(getText("trips.txt")), stopTimesRows);

    return { stations, lines, schedules, trips };
  }

  private parseStations(rows: CsvRow[]): Station[] {
    return rows.map((row) => {
      const lat = parseFloat(row["stop_lat"]!);
      const lon = parseFloat(row["stop_lon"]!);
      return Station.create(row["stop_id"]!, row["stop_name"]!, new StationLocation(lat, lon));
    });
  }

  private parseSchedules(calendarRows: CsvRow[], calendarDatesRows: CsvRow[]): Schedule[] {
    // Group exceptions by service_id
    const exceptionsMap = new Map<string, ScheduleException[]>();
    for (const row of calendarDatesRows) {
      const serviceId = row["service_id"]!;
      const date = reformatDate(row["date"]!);
      const isActive = row["exception_type"] === "1";
      if (!exceptionsMap.has(serviceId)) {
        exceptionsMap.set(serviceId, []);
      }
      exceptionsMap.get(serviceId)!.push(new ScheduleException(date, isActive));
    }

    return calendarRows.map((row) => {
      const serviceId = row["service_id"]!;
      const weekdays = new Weekdays(
        row["monday"] === "1",
        row["tuesday"] === "1",
        row["wednesday"] === "1",
        row["thursday"] === "1",
        row["friday"] === "1",
        row["saturday"] === "1",
        row["sunday"] === "1",
      );
      const dateRange = new DateRange(
        reformatDate(row["start_date"]!),
        reformatDate(row["end_date"]!),
      );
      const exceptions = exceptionsMap.get(serviceId) ?? [];
      return new Schedule(new ScheduleId(serviceId), weekdays, dateRange, exceptions);
    });
  }

  private parseLines(routeRows: CsvRow[], tripRows: CsvRow[], stopTimesRows: CsvRow[]): Line[] {
    // Build stop_times grouped by trip_id
    const stopTimesByTrip = new Map<string, CsvRow[]>();
    for (const row of stopTimesRows) {
      const tripId = row["trip_id"]!;
      if (!stopTimesByTrip.has(tripId)) {
        stopTimesByTrip.set(tripId, []);
      }
      stopTimesByTrip.get(tripId)!.push(row);
    }

    // Build route name map
    const routeNameMap = new Map<string, string>();
    for (const row of routeRows) {
      const name = row["route_long_name"] || row["route_short_name"] || row["route_id"]!;
      routeNameMap.set(row["route_id"]!, name);
    }

    // Group trips by (route_id, direction_id)
    const lineMap = new Map<
      string,
      { routeId: string; direction: LineDirection; stopRows: CsvRow[] }
    >();
    for (const trip of tripRows) {
      const key = `${trip["route_id"]!}__${trip["direction_id"]!}`;
      const direction = parseDirection(trip["direction_id"]!);
      if (!lineMap.has(key)) {
        lineMap.set(key, { routeId: trip["route_id"]!, direction, stopRows: [] });
      }
      const entry = lineMap.get(key)!;
      const tripStops = stopTimesByTrip.get(trip["trip_id"]!) ?? [];
      entry.stopRows.push(...tripStops);
    }

    const lines: Line[] = [];
    for (const [key, { routeId, direction, stopRows }] of lineMap) {
      const lineId = new LineId(key);
      const name = routeNameMap.get(routeId) ?? routeId;

      // Dedupe stops by stationId, keep lowest sequence seen
      const seqByStation = new Map<string, number>();
      for (const row of stopRows) {
        const stationId = row["stop_id"]!;
        const seq = parseInt(row["stop_sequence"]!, 10);
        const existing = seqByStation.get(stationId);
        if (existing === undefined || seq < existing) {
          seqByStation.set(stationId, seq);
        }
      }

      const stops: LineStop[] = Array.from(seqByStation.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([stationId, sequence]) => new LineStop(new StationId(stationId), sequence));

      lines.push(new Line(lineId, new LineName(name), direction, stops));
    }

    return lines;
  }

  private parseTrips(tripRows: CsvRow[], stopTimesRows: CsvRow[]): Trip[] {
    // Group stop_times by trip_id
    const stopTimesByTrip = new Map<string, CsvRow[]>();
    for (const row of stopTimesRows) {
      const tripId = row["trip_id"]!;
      if (!stopTimesByTrip.has(tripId)) {
        stopTimesByTrip.set(tripId, []);
      }
      stopTimesByTrip.get(tripId)!.push(row);
    }

    return tripRows.map((row) => {
      const tripId = row["trip_id"]!;
      const routeId = row["route_id"]!;
      const directionId = row["direction_id"]!;
      const direction = parseDirection(directionId);
      const lineId = new LineId(`${routeId}__${directionId}`);

      const stopRows = (stopTimesByTrip.get(tripId) ?? []).sort(
        (a, b) => parseInt(a["stop_sequence"]!, 10) - parseInt(b["stop_sequence"]!, 10),
      );

      const passingTimes: PassingTime[] = stopRows.map((st) => {
        const stationId = new StationId(st["stop_id"]!);
        const arrivalTime = new TimeOfDay(st["arrival_time"]!);
        const departureTime = new TimeOfDay(st["departure_time"]!);
        const sequence = parseInt(st["stop_sequence"]!, 10);
        return new PassingTime(stationId, arrivalTime, departureTime, sequence);
      });

      return new Trip(
        new TripId(tripId),
        lineId,
        new ScheduleId(row["service_id"]!),
        direction,
        passingTimes,
      );
    });
  }
}
