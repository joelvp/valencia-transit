import { describe, it, expect, mock } from "bun:test";
import { SearchNextDepartures } from "./SearchNextDepartures";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { RouteRepository } from "@/core/domain/route/RouteRepository";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { Station } from "@/core/domain/station/Station";
import { StationId } from "@/core/domain/station/StationId";
import { StationName } from "@/core/domain/station/StationName";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineStop } from "@/core/domain/line/LineStop";
import { LineColor } from "@/core/domain/line/LineColor";
import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { RouteId } from "@/core/domain/route/RouteId";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { PassingTime } from "@/core/domain/trip/PassingTime";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { Schedule } from "@/core/domain/schedule/Schedule";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { StationsNotConnectedError } from "@/core/domain/error/StationsNotConnectedError";
import { NoServiceError } from "@/core/domain/error/NoServiceError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import { TransportType } from "@/core/domain/shared/TransportType";

const originId = new StationId("S1");
const destId = new StationId("S2");
// lineId and routeId share the same value so SearchNextDepartures filter passes
const lineId = new LineId("L3");
const routeId = new RouteId("L3");
const scheduleId = new ScheduleId("SC1");

const origin = new Station(originId, new StationName("Xàtiva"), new StationLocation(39.47, -0.37), [
  TransportType.METRO,
]);
const destination = new Station(
  destId,
  new StationName("Colón"),
  new StationLocation(39.48, -0.36),
  [TransportType.METRO],
);

const line = new Line(lineId, new LineName("L3"), [
  new LineStop(originId, 1),
  new LineStop(destId, 2),
]);

const now = new Date(Date.UTC(2026, 2, 18, 13, 0, 0)); // 13:00 UTC = 14:00 Madrid (CET)

const trip = new Trip(
  new TripId("T1"),
  routeId,
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
    findByStationIds: () => Promise<Line[]>;
    findActiveOn: (date: Date) => Promise<Schedule[]>;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    findDeparturesFromStation: (...args: any[]) => Promise<Trip[]>;
  }>,
): {
  stationRepo: StationRepository;
  lineRepo: LineRepository;
  routeRepo: RouteRepository;
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
    updateTransportTypes: mock(() => Promise.resolve()),
  };
  const lineRepo: LineRepository = {
    findByStationIds: mock(overrides.findByStationIds ?? (() => Promise.resolve([line]))),
    findAll: mock(() => Promise.resolve([])),
    saveMany: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  // routeId and lineId share value "L3" in tests — mock maps routeId → lineId directly
  const routeRepo: RouteRepository = {
    findLineIdsByRouteIds: mock(() => Promise.resolve(new Map([["L3", "L3"]]))),
    saveMany: mock(() => Promise.resolve()),
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
    findByRouteAndSchedule: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const eventBus: EventBus = {
    publish: mock(() => Promise.resolve()),
  };
  return { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus };
}

describe("SearchNextDepartures", () => {
  it("should return departures for a valid origin and destination", async () => {
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
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
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    await useCase.execute("Xàtiva", "Colón", now);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("should fall back to searchByName when findByName returns null", async () => {
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: () => Promise.resolve(null),
      searchByName: (query) =>
        Promise.resolve(query === "Xàtiva" ? [origin] : query === "Colón" ? [destination] : []),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.origin).toEqual(origin);
    expect(result.data.destination).toEqual(destination);
  });

  it("should throw StationNotFoundError when station cannot be resolved", async () => {
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: () => Promise.resolve(null),
      searchByName: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    expect(useCase.execute("Unknown", "Colón", now)).rejects.toBeInstanceOf(StationNotFoundError);
  });

  it("should return disambiguation when origin has multiple matches", async () => {
    const station3 = new Station(
      new StationId("S3"),
      new StationName("Àngel Guimerà"),
      new StationLocation(39.46, -0.38),
      [TransportType.METRO],
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: () => Promise.resolve(null),
      searchByName: () => Promise.resolve([origin, destination, station3]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
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
      [TransportType.METRO],
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) => Promise.resolve(name === "Xàtiva" ? origin : null),
      searchByName: () => Promise.resolve([destination, station3]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("disambiguation");
    if (result.type !== "disambiguation") return;
    expect(result.field).toBe("destination");
    expect(result.candidates).toHaveLength(2);
    expect(result.otherName).toBe("Xàtiva");
  });

  it("should throw StationsNotConnectedError when no trips and no official lines", async () => {
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve([]),
      findByStationIds: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    expect(useCase.execute("Xàtiva", "Colón", now)).rejects.toBeInstanceOf(
      StationsNotConnectedError,
    );
  });

  it("should throw NoServiceError when official lines exist but no trips today or tomorrow", async () => {
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    expect(useCase.execute("Xàtiva", "Colón", now)).rejects.toBeInstanceOf(NoServiceError);
  });

  it("should throw NoActiveServiceError when no schedules active", async () => {
    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: () => Promise.resolve([]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
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
          routeId,
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

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve(manyTrips),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
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
    const lateNow = new Date(Date.UTC(2026, 2, 18, 22, 0, 0)); // 22:00 UTC = 23:00 Madrid (CET);
    const earlyTrip = new Trip(
      new TripId("T-early"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("06:00:00"), new TimeOfDay("06:00:00"), 1),
        new PassingTime(destId, new TimeOfDay("06:10:00"), new TimeOfDay("06:10:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
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
      routeRepo,
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

  it("should find departures even when line_stations has merged bidirectional sequences", async () => {
    // Regression: line_stations may store both directions merged, giving dest a lower seq than origin.
    // The use case must rely on trip.stopsInOrder (passing_times) — not line.connectsInOrder.
    const lineWithMergedSeqs = new Line(lineId, new LineName("L3"), [
      new LineStop(destId, 1), // destination appears first (wrong order in line_stations)
      new LineStop(originId, 7), // origin appears later
    ]);

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findByStationIds: () => Promise.resolve([lineWithMergedSeqs]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    // trip has correct passing_times: origin seq=1, dest seq=2
    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(1);
  });

  it("should propagate lineColor in no_more_today firstTomorrow", async () => {
    const lateNow = new Date(Date.UTC(2026, 2, 18, 22, 0, 0)); // 22:00 UTC = 23:00 Madrid (CET);
    const lineWithColor = new Line(
      lineId,
      new LineName("L3"),
      [new LineStop(originId, 1), new LineStop(destId, 2)],
      new LineColor("FF0000"),
    );

    const earlyTrip = new Trip(
      new TripId("T-early"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("06:00:00"), new TimeOfDay("06:00:00"), 1),
        new PassingTime(destId, new TimeOfDay("06:10:00"), new TimeOfDay("06:10:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findByStationIds: () => Promise.resolve([lineWithColor]),
      findDeparturesFromStation: (stationId, after) => {
        if (after.value === "00:00:00") return Promise.resolve([earlyTrip]);
        return Promise.resolve([]);
      },
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", lateNow);

    expect(result.type).toBe("no_more_today");
    if (result.type !== "no_more_today") return;
    expect(result.firstTomorrow).not.toBeNull();
    expect(result.firstTomorrow!.lineColor).toBe("FF0000");
  });

  it("should include post-midnight crossover trips when current time is before threshold", async () => {
    // 00:04 Madrid (CET, UTC+1) = 23:04 UTC on the calendar day before
    // earlyMorning is March 18 23:04 UTC (= March 19 00:04 Madrid)
    const earlyMorning = new Date(Date.UTC(2026, 2, 18, 23, 4, 0));
    const crossoverTrip = new Trip(
      new TripId("T-cross"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("24:12:00"), new TimeOfDay("24:12:00"), 1),
        new PassingTime(destId, new TimeOfDay("24:22:00"), new TimeOfDay("24:22:00"), 2),
      ],
      "Direction A",
    );
    const sameDayTrip = new Trip(
      new TripId("T-same"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("05:42:00"), new TimeOfDay("05:42:00"), 1),
        new PassingTime(destId, new TimeOfDay("05:52:00"), new TimeOfDay("05:52:00"), 2),
      ],
      "Direction A",
    );
    const mondaySchedule = makeSchedule();
    const tuesdaySchedule = new Schedule(
      new ScheduleId("SC2"),
      new Weekdays(true, true, true, true, true, true, true),
      new DateRange("2026-01-01", "2026-12-31"),
      [],
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: (date) => {
        // earlyMorning UTC date is 18; previousDay UTC date is 17
        if (date.getUTCDate() === 18) return Promise.resolve([tuesdaySchedule]);
        if (date.getUTCDate() === 17) return Promise.resolve([mondaySchedule]);
        return Promise.resolve([]);
      },
      findDeparturesFromStation: (stationId, after) => {
        if (after.hours >= 24) return Promise.resolve([crossoverTrip]);
        return Promise.resolve([sameDayTrip]);
      },
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", earlyMorning);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(2);
    // Crossover trip (24:12 = 8 min away) must appear before same-day trip (05:42 = 338 min away)
    expect(result.data.departures[0]!.departureTime.value).toBe("24:12:00");
    expect(result.data.departures[0]!.minutesRemaining).toBe(8);
    expect(result.data.departures[1]!.departureTime.value).toBe("05:42:00");
  });

  it("should not perform crossover check when current time is at or above threshold", async () => {
    // 06:00 Madrid (CET) = 05:00 UTC — at the threshold, no crossover check
    const morningNow = new Date(Date.UTC(2026, 2, 18, 5, 0, 0));
    const previousDayUTC = 17; // morningNow is UTC date 18, previous day is 17

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: () => Promise.resolve([makeSchedule()]),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    await useCase.execute("Xàtiva", "Colón", morningNow);

    const calls = (scheduleRepo.findActiveOn as ReturnType<typeof mock>).mock.calls as [Date][];
    const crossoverCallMade = calls.some(([d]) => d.getUTCDate() === previousDayUTC);
    expect(crossoverCallMade).toBe(false);
  });

  it("should return no_more_today with null firstTomorrow when no service tomorrow", async () => {
    const lateNow = new Date(Date.UTC(2026, 2, 18, 22, 0, 0)); // 22:00 UTC = 23:00 Madrid (CET);

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
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
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", lateNow);

    expect(result.type).toBe("no_more_today");
    if (result.type !== "no_more_today") return;
    expect(result.firstTomorrow).toBeNull();
  });
});
