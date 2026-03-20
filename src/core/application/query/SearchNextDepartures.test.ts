import { describe, it, expect, mock } from "bun:test";
import { SearchNextDepartures } from "./SearchNextDepartures.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { ScheduleRepository } from "../../domain/schedule/ScheduleRepository.ts";
import type { TripRepository } from "../../domain/trip/TripRepository.ts";
import type { EventBus } from "../../domain/event/EventBus.ts";
import { Station } from "../../domain/station/Station.ts";
import { StationId } from "../../domain/station/StationId.ts";
import { StationName } from "../../domain/station/StationName.ts";
import { StationLocation } from "../../domain/station/StationLocation.ts";
import { Line } from "../../domain/line/Line.ts";
import { LineId } from "../../domain/line/LineId.ts";
import { LineName } from "../../domain/line/LineName.ts";
import { LineStop } from "../../domain/line/LineStop.ts";
import { Trip } from "../../domain/trip/Trip.ts";
import { TripId } from "../../domain/trip/TripId.ts";
import { ScheduleId } from "../../domain/schedule/ScheduleId.ts";
import { PassingTime } from "../../domain/trip/PassingTime.ts";
import { TimeOfDay } from "../../domain/shared/TimeOfDay.ts";
import { Schedule } from "../../domain/schedule/Schedule.ts";
import { Weekdays } from "../../domain/schedule/Weekdays.ts";
import { DateRange } from "../../domain/schedule/DateRange.ts";
import { StationNotFoundError } from "../../domain/error/StationNotFoundError.ts";
import { NoConnectionError } from "../../domain/error/NoConnectionError.ts";
import { NoActiveServiceError } from "../../domain/error/NoActiveServiceError.ts";

const originId = new StationId("S1");
const destId = new StationId("S2");
const lineId = new LineId("L3");
const scheduleId = new ScheduleId("SC1");

const origin = new Station(originId, new StationName("Xàtiva"), new StationLocation(39.47, -0.37));
const destination = new Station(
  destId,
  new StationName("Colón"),
  new StationLocation(39.48, -0.36),
);

const line = new Line(lineId, new LineName("L3"), [
  new LineStop(originId, 1),
  new LineStop(destId, 2),
]);

const now = new Date(2026, 2, 18, 14, 0, 0);

const trip = new Trip(
  new TripId("T1"),
  lineId,
  scheduleId,
  [
    new PassingTime(originId, new TimeOfDay("14:30:00"), new TimeOfDay("14:30:00"), 1),
    new PassingTime(destId, new TimeOfDay("14:40:00"), new TimeOfDay("14:40:00"), 2),
  ],
  "Direction A",
);

function makeSchedule(): Schedule {
  return new Schedule(
    scheduleId,
    new Weekdays(true, true, true, true, true, true, true),
    new DateRange("2026-01-01", "2026-12-31"),
    [],
  );
}

function makeRepos(
  overrides: Partial<{
    findByName: (name: string) => Promise<Station | null>;
    searchByName: (query: string) => Promise<Station[]>;
    findByStations: () => Promise<Line[]>;
    findActiveOn: (date: Date) => Promise<Schedule[]>;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    findDeparturesFromStation: (...args: any[]) => Promise<Trip[]>;
  }>,
): {
  stationRepo: StationRepository;
  lineRepo: LineRepository;
  scheduleRepo: ScheduleRepository;
  tripRepo: TripRepository;
  eventBus: EventBus;
} {
  const stationRepo: StationRepository = {
    findByName: mock(overrides.findByName ?? (() => Promise.resolve(null))),
    searchByName: mock(overrides.searchByName ?? (() => Promise.resolve([]))),
    findAll: mock(() => Promise.resolve([])),
    findById: mock(() => Promise.resolve(null)),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const lineRepo: LineRepository = {
    findByStations: mock(overrides.findByStations ?? (() => Promise.resolve([line]))),
    findById: mock(() => Promise.resolve(null)),
    findByStationId: mock(() => Promise.resolve([])),
    findAll: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const scheduleRepo: ScheduleRepository = {
    findActiveOn: mock(overrides.findActiveOn ?? (() => Promise.resolve([makeSchedule()]))),
    findById: mock(() => Promise.resolve(null)),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const tripRepo: TripRepository = {
    findDeparturesFromStation: mock(
      overrides.findDeparturesFromStation ?? (() => Promise.resolve([trip])),
    ),
    findByLineAndSchedule: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const eventBus: EventBus = {
    publish: mock(() => Promise.resolve()),
  };
  return { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus };
}

describe("SearchNextDepartures", () => {
  it("should return departures for a valid origin and destination", async () => {
    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.origin).toEqual(origin);
    expect(result.data.destination).toEqual(destination);
    expect(result.data.departures).toHaveLength(1);
    expect(result.data.departures[0]!.lineName).toBe("L3");
    expect(result.data.departures[0]!.headsign).toBe("Direction A");
    expect(result.data.searchedAt).toEqual(now);
  });

  it("should publish a DepartureSearched event", async () => {
    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    await useCase.execute("Xàtiva", "Colón", now);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("should fall back to searchByName when findByName returns null", async () => {
    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: () => Promise.resolve(null),
      searchByName: (query) =>
        Promise.resolve(query === "Xàtiva" ? [origin] : query === "Colón" ? [destination] : []),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.origin).toEqual(origin);
    expect(result.data.destination).toEqual(destination);
  });

  it("should throw StationNotFoundError when station cannot be resolved", async () => {
    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: () => Promise.resolve(null),
      searchByName: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    expect(useCase.execute("Unknown", "Colón", now)).rejects.toBeInstanceOf(StationNotFoundError);
  });

  it("should return disambiguation when origin has multiple matches", async () => {
    const station3 = new Station(
      new StationId("S3"),
      new StationName("Àngel Guimerà"),
      new StationLocation(39.46, -0.38),
    );

    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: () => Promise.resolve(null),
      searchByName: () => Promise.resolve([origin, destination, station3]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("disambiguation");
    if (result.type !== "disambiguation") return;
    expect(result.field).toBe("origin");
    expect(result.candidates).toHaveLength(3);
    expect(result.otherName).toBe("Colón");
  });

  it("should return disambiguation when destination has multiple matches", async () => {
    const station3 = new Station(
      new StationId("S3"),
      new StationName("Àngel Guimerà"),
      new StationLocation(39.46, -0.38),
    );

    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) => Promise.resolve(name === "Xàtiva" ? origin : null),
      searchByName: () => Promise.resolve([destination, station3]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("disambiguation");
    if (result.type !== "disambiguation") return;
    expect(result.field).toBe("destination");
    expect(result.candidates).toHaveLength(2);
    expect(result.otherName).toBe("Xàtiva");
  });

  it("should throw NoConnectionError when no connecting lines found", async () => {
    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findByStations: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    expect(useCase.execute("Xàtiva", "Colón", now)).rejects.toBeInstanceOf(NoConnectionError);
  });

  it("should throw NoActiveServiceError when no schedules active", async () => {
    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    expect(useCase.execute("Xàtiva", "Colón", now)).rejects.toBeInstanceOf(NoActiveServiceError);
  });

  it("should limit results to maxDepartures", async () => {
    const manyTrips = Array.from(
      { length: 10 },
      (_, i) =>
        new Trip(
          new TripId(`T${i}`),
          lineId,
          scheduleId,
          [
            new PassingTime(
              originId,
              new TimeOfDay(`14:${String(i * 3).padStart(2, "0")}:00`),
              new TimeOfDay(`14:${String(i * 3).padStart(2, "0")}:00`),
              1,
            ),
            new PassingTime(
              destId,
              new TimeOfDay(`14:${String(i * 3 + 2).padStart(2, "0")}:00`),
              new TimeOfDay(`14:${String(i * 3 + 2).padStart(2, "0")}:00`),
              2,
            ),
          ],
          null,
        ),
    );

    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve(manyTrips),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
      3,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(3);
  });

  it("should return no_more_today when no departures remain and find first tomorrow", async () => {
    // Trips only at 06:00 — querying at 23:00 yields nothing today
    const lateNow = new Date(2026, 2, 18, 23, 0, 0);
    const earlyTrip = new Trip(
      new TripId("T-early"),
      lineId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("06:00:00"), new TimeOfDay("06:00:00"), 1),
        new PassingTime(destId, new TimeOfDay("06:10:00"), new TimeOfDay("06:10:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: (stationId, after) => {
        // After 23:00 → no trips. After 00:00 (tomorrow query) → return earlyTrip
        if (after.value === "00:00:00") return Promise.resolve([earlyTrip]);
        return Promise.resolve([]);
      },
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", lateNow);

    expect(result.type).toBe("no_more_today");
    if (result.type !== "no_more_today") return;
    expect(result.origin).toEqual(origin);
    expect(result.destination).toEqual(destination);
    expect(result.firstTomorrow).not.toBeNull();
    expect(result.firstTomorrow!.departureTime.value).toBe("06:00:00");
  });

  it("should return no_more_today with null firstTomorrow when no service tomorrow", async () => {
    const lateNow = new Date(2026, 2, 18, 23, 0, 0);

    const { stationRepo, lineRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve([]),
      findActiveOn: (date) => {
        // Only today has service, tomorrow doesn't
        if (date.getDate() === 18) return Promise.resolve([makeSchedule()]);
        return Promise.resolve([]);
      },
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", lateNow);

    expect(result.type).toBe("no_more_today");
    if (result.type !== "no_more_today") return;
    expect(result.firstTomorrow).toBeNull();
  });
});
