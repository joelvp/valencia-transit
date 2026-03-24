import AdmZip from "adm-zip";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineColor } from "@/core/domain/line/LineColor";
import { LineStop } from "@/core/domain/line/LineStop";
import { Route } from "@/core/domain/route/Route";
import { RouteId } from "@/core/domain/route/RouteId";
import { RouteStation } from "@/core/domain/route/RouteStation";
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
import type { GtfsData } from "@/core/domain/shared/GtfsData";

export type { GtfsData };

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

const LINE_COLORS: Record<string, string> = {
  "1": "FEC601",
  "2": "E60096",
  "3": "DD052C",
  "4": "014A99",
  "5": "008F71",
  "6": "8884BF",
  "7": "F28D01",
  "8": "82CEE6",
  "9": "B8804F",
  "10": "B7DD79",
};

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
    const routeRows = parseCsv(getText("routes.txt"));
    const tripRows = parseCsv(getText("trips.txt"));
    const routes = this.parseRoutes(routeRows, tripRows, stopTimesRows);
    const lines = this.parseLines(routeRows, tripRows, stopTimesRows);
    const trips = this.parseTrips(tripRows, stopTimesRows);

    return { stations, routes, lines, schedules, trips };
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

  private parseRoutes(routeRows: CsvRow[], tripRows: CsvRow[], stopTimesRows: CsvRow[]): Route[] {
    // Build stop_ids by trip
    const stopsByTrip = new Map<string, Set<string>>();
    for (const row of stopTimesRows) {
      const tripId = row["trip_id"]!;
      if (!stopsByTrip.has(tripId)) stopsByTrip.set(tripId, new Set());
      stopsByTrip.get(tripId)!.add(row["stop_id"]!);
    }

    // Build trips by route
    const tripsByRoute = new Map<string, string[]>();
    for (const trip of tripRows) {
      const routeId = trip["route_id"]!;
      if (!tripsByRoute.has(routeId)) tripsByRoute.set(routeId, []);
      tripsByRoute.get(routeId)!.push(trip["trip_id"]!);
    }

    // short_name per route (used as lineId)
    const shortNameByRoute = new Map<string, string>();
    for (const row of routeRows) {
      shortNameByRoute.set(row["route_id"]!, row["route_short_name"] || row["route_id"]!);
    }

    const result: Route[] = [];
    for (const row of routeRows) {
      const routeId = row["route_id"]!;
      const lineId = new LineId(shortNameByRoute.get(routeId)!);
      const tripIds = tripsByRoute.get(routeId) ?? [];
      const stationSet = new Set<string>();
      for (const tripId of tripIds) {
        for (const stopId of stopsByTrip.get(tripId) ?? []) {
          stationSet.add(stopId);
        }
      }
      const stations = [...stationSet].map((sid) => new RouteStation(new StationId(sid)));
      result.push(new Route(new RouteId(routeId), lineId, stations));
    }
    return result;
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

    // Group route_ids by route_short_name
    const routesByShortName = new Map<string, string[]>();
    for (const row of routeRows) {
      const shortName = row["route_short_name"] || row["route_id"]!;
      if (!routesByShortName.has(shortName)) routesByShortName.set(shortName, []);
      routesByShortName.get(shortName)!.push(row["route_id"]!);
    }

    // Build trip rows by route_id
    const tripRowsByRoute = new Map<string, CsvRow[]>();
    for (const trip of tripRows) {
      const routeId = trip["route_id"]!;
      if (!tripRowsByRoute.has(routeId)) tripRowsByRoute.set(routeId, []);
      tripRowsByRoute.get(routeId)!.push(trip);
    }

    const resultLines: Line[] = [];

    for (const [shortName, routeIds] of routesByShortName) {
      // All trips for this line
      const allTrips: CsvRow[] = routeIds.flatMap((rid) => tripRowsByRoute.get(rid) ?? []);
      if (allTrips.length === 0) continue;

      // Count how many trips serve each station
      const tripCountByStation = new Map<string, number>();
      for (const trip of allTrips) {
        const tripId = trip["trip_id"]!;
        for (const stop of stopTimesByTrip.get(tripId) ?? []) {
          const stopId = stop["stop_id"]!;
          tripCountByStation.set(stopId, (tripCountByStation.get(stopId) ?? 0) + 1);
        }
      }

      // Keep stations with >= 15% coverage across all line trips
      const threshold = allTrips.length * 0.15;
      const coveredStations = new Set<string>(
        [...tripCountByStation.entries()]
          .filter(([, count]) => count >= threshold)
          .map(([stopId]) => stopId),
      );

      // Reference trip: longest trip among all line trips
      let refTripId: string | null = null;
      let refStopCount = -1;
      for (const trip of allTrips) {
        const tripId = trip["trip_id"]!;
        const count = stopTimesByTrip.get(tripId)?.length ?? 0;
        if (count > refStopCount) {
          refTripId = tripId;
          refStopCount = count;
        }
      }

      if (refTripId === null) continue;

      // Build initial sequence from the reference trip (covered stations only)
      const refStopIds: string[] = [...(stopTimesByTrip.get(refTripId) ?? [])]
        .sort((a, b) => parseInt(a["stop_sequence"]!, 10) - parseInt(b["stop_sequence"]!, 10))
        .map((row) => row["stop_id"]!)
        .filter((id) => coveredStations.has(id));

      const sequence: string[] = [...refStopIds];

      // Insert covered stations missing from the reference trip
      const missing = [...coveredStations].filter((id) => !sequence.includes(id));

      // Build a lookup: stopId → sorted stop ids per trip (for fast access)
      const tripStopIds = new Map<string, string[]>();
      for (const trip of allTrips) {
        const tripId = trip["trip_id"]!;
        tripStopIds.set(
          tripId,
          [...(stopTimesByTrip.get(tripId) ?? [])]
            .sort((a, b) => parseInt(a["stop_sequence"]!, 10) - parseInt(b["stop_sequence"]!, 10))
            .map((r) => r["stop_id"]!),
        );
      }

      for (const missingId of missing) {
        let bestInsertIdx = -1;

        for (const trip of allTrips) {
          const tripId = trip["trip_id"]!;
          const stops = tripStopIds.get(tripId) ?? [];
          const missingPos = stops.indexOf(missingId);
          if (missingPos === -1) continue;

          // Closest overlap stop before missingId in this trip
          let prevIdx = -1;
          for (let i = missingPos - 1; i >= 0; i--) {
            const idx = sequence.indexOf(stops[i]!);
            if (idx !== -1) {
              prevIdx = idx;
              break;
            }
          }

          // Closest overlap stop after missingId in this trip
          let nextIdx = -1;
          for (let i = missingPos + 1; i < stops.length; i++) {
            const idx = sequence.indexOf(stops[i]!);
            if (idx !== -1) {
              nextIdx = idx;
              break;
            }
          }

          // Insertion point = after the lower of the two surrounding bounds
          let insertAfter = -1;
          if (prevIdx !== -1 && nextIdx !== -1) {
            insertAfter = Math.min(prevIdx, nextIdx);
          } else if (prevIdx !== -1) {
            insertAfter = prevIdx;
          } else if (nextIdx !== -1) {
            insertAfter = nextIdx - 1;
          }

          if (insertAfter > bestInsertIdx) bestInsertIdx = insertAfter;
        }

        sequence.splice(bestInsertIdx + 1, 0, missingId);
      }

      const stops: LineStop[] = sequence.map(
        (stopId, index) => new LineStop(new StationId(stopId), index + 1),
      );

      const colorHex = LINE_COLORS[shortName];
      const color = colorHex ? new LineColor(colorHex) : null;
      const name = `Línia ${shortName}`;
      resultLines.push(new Line(new LineId(shortName), new LineName(name), stops, color));
    }

    return resultLines;
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

      const headsign = row["trip_headsign"] ?? null;
      return new Trip(
        new TripId(tripId),
        new RouteId(routeId),
        new ScheduleId(row["service_id"]!),
        passingTimes,
        headsign,
      );
    });
  }
}
