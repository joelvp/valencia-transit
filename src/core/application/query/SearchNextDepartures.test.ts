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
    hasServiceStarted: (...args: any[]) => Promise<boolean>;
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
    hasServiceStarted: mock(overrides.hasServiceStarted ?? (() => Promise.resolve(true))),
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
      hasServiceStarted: () => Promise.resolve(false),
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

  it("should merge crossover and today trips and slice to maxDepartures", async () => {
    // 00:05 Madrid (CET+1) = 2026-03-19 23:05 UTC
    const earlyMorning = new Date(Date.UTC(2026, 2, 19, 23, 5, 0));
    const sc2 = new Schedule(
      new ScheduleId("SC2"),
      new Weekdays(true, true, true, true, true, true, true),
      new DateRange("2026-01-01", "2026-12-31"),
      [],
    );

    const makeTrip = (id: string, time: string) =>
      new Trip(
        new TripId(id),
        routeId,
        scheduleId,
        [
          new PassingTime(originId, new TimeOfDay(time), new TimeOfDay(time), 1),
          new PassingTime(destId, new TimeOfDay(time), new TimeOfDay(time), 2),
        ],
        "Direction A",
      );

    // 2 crossover trips from yesterday: 24:09, 24:40
    const crossTrip1 = makeTrip("TC1", "24:09:00");
    const crossTrip2 = makeTrip("TC2", "24:40:00");
    // 4 today trips: 05:30, 06:00, 06:30, 07:00
    const todayTrip1 = makeTrip("TD1", "05:30:00");
    const todayTrip2 = makeTrip("TD2", "06:00:00");
    const todayTrip3 = makeTrip("TD3", "06:30:00");
    const todayTrip4 = makeTrip("TD4", "07:00:00");

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: (date) => {
        if (date.getUTCDate() === 19) return Promise.resolve([makeSchedule()]);
        if (date.getUTCDate() === 18) return Promise.resolve([sc2]);
        return Promise.resolve([]);
      },
      findDeparturesFromStation: (_stationId, after) => {
        if (after.hours >= 24) return Promise.resolve([crossTrip1, crossTrip2]);
        return Promise.resolve([todayTrip1, todayTrip2, todayTrip3, todayTrip4]);
      },
      hasServiceStarted: () => Promise.resolve(false),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
      5,
    );
    const result = await useCase.execute("Xàtiva", "Colón", earlyMorning);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(5);
    expect(result.data.departures[0]!.departureTime.value).toBe("24:09:00");
    expect(result.data.departures[1]!.departureTime.value).toBe("24:40:00");
    expect(result.data.departures[2]!.departureTime.value).toBe("05:30:00");
    expect(result.data.departures[3]!.departureTime.value).toBe("06:00:00");
    expect(result.data.departures[4]!.departureTime.value).toBe("06:30:00");
  });

  it("should return only crossover trips when they fill maxDepartures", async () => {
    // 00:05 Madrid = 2026-03-19 23:05 UTC
    const earlyMorning = new Date(Date.UTC(2026, 2, 19, 23, 5, 0));
    const sc2 = new Schedule(
      new ScheduleId("SC2"),
      new Weekdays(true, true, true, true, true, true, true),
      new DateRange("2026-01-01", "2026-12-31"),
      [],
    );

    const makeTrip = (id: string, time: string) =>
      new Trip(
        new TripId(id),
        routeId,
        scheduleId,
        [
          new PassingTime(originId, new TimeOfDay(time), new TimeOfDay(time), 1),
          new PassingTime(destId, new TimeOfDay(time), new TimeOfDay(time), 2),
        ],
        "Direction A",
      );

    // 6 crossover trips from yesterday, every 10 min from 24:06
    const crossTrips = ["24:06:00", "24:16:00", "24:26:00", "24:36:00", "24:46:00", "24:56:00"].map(
      (t, i) => makeTrip(`TC${i}`, t),
    );
    // 3 today trips
    const todayTrips = ["05:00:00", "06:00:00", "07:00:00"].map((t, i) => makeTrip(`TD${i}`, t));

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: (date) => {
        if (date.getUTCDate() === 19) return Promise.resolve([makeSchedule()]);
        if (date.getUTCDate() === 18) return Promise.resolve([sc2]);
        return Promise.resolve([]);
      },
      findDeparturesFromStation: (_stationId, after) => {
        if (after.hours >= 24) return Promise.resolve(crossTrips);
        return Promise.resolve(todayTrips);
      },
      hasServiceStarted: () => Promise.resolve(false),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
      5,
    );
    const result = await useCase.execute("Xàtiva", "Colón", earlyMorning);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(5);
    result.data.departures.forEach((d) => {
      expect(d.departureTime.hours).toBeGreaterThanOrEqual(24);
    });
  });

  it("should not call hasServiceStarted when current time is at or above the threshold", async () => {
    // 11:00 Madrid (CET) = 10:00 UTC
    const midMorning = new Date(Date.UTC(2026, 2, 19, 10, 0, 0));

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
    await useCase.execute("Xàtiva", "Colón", midMorning);

    expect(tripRepo.hasServiceStarted).not.toHaveBeenCalled();
  });

  it("should use only today trips when service has started within the crossover window", async () => {
    // 06:30 Madrid (CET) = 05:30 UTC
    const morningStarted = new Date(Date.UTC(2026, 2, 19, 5, 30, 0));
    const trip700 = new Trip(
      new TripId("T700"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("07:00:00"), new TimeOfDay("07:00:00"), 1),
        new PassingTime(destId, new TimeOfDay("07:10:00"), new TimeOfDay("07:10:00"), 2),
      ],
      "Direction A",
    );
    const trip730 = new Trip(
      new TripId("T730"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("07:30:00"), new TimeOfDay("07:30:00"), 1),
        new PassingTime(destId, new TimeOfDay("07:40:00"), new TimeOfDay("07:40:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve([trip700, trip730]),
      hasServiceStarted: () => Promise.resolve(true),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", morningStarted);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    // No previous-day query — only today trips
    const findActiveCalls = (scheduleRepo.findActiveOn as ReturnType<typeof mock>).mock.calls as [
      Date,
    ][];
    const queriedUTCDates = findActiveCalls.map(([d]) => d.getUTCDate());
    // previousDay UTC = 18, should not appear
    expect(queriedUTCDates).not.toContain(18);
    // minutesRemaining must be positive
    result.data.departures.forEach((d) => {
      expect(d.minutesRemaining).toBeGreaterThan(0);
    });
  });

  it("should use only today trips when previous-day schedules are empty", async () => {
    // 00:05 Madrid = 2026-03-19 23:05 UTC
    const earlyMorning = new Date(Date.UTC(2026, 2, 19, 23, 5, 0));
    const todayTrip = new Trip(
      new TripId("TD1"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("05:00:00"), new TimeOfDay("05:00:00"), 1),
        new PassingTime(destId, new TimeOfDay("05:10:00"), new TimeOfDay("05:10:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: (date) => {
        // Only the "today" query (UTC date 19) returns schedules; yesterday returns []
        if (date.getUTCDate() === 19) return Promise.resolve([makeSchedule()]);
        return Promise.resolve([]);
      },
      findDeparturesFromStation: () => Promise.resolve([todayTrip]),
      hasServiceStarted: () => Promise.resolve(false),
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
    expect(result.data.departures).toHaveLength(1);
    expect(result.data.departures[0]!.departureTime.value).toBe("05:00:00");
  });

  it("should compute minutesRemaining correctly for a 24:xx crossover trip", async () => {
    // 00:08 Madrid (CET) = 2026-03-18 23:08 UTC
    const earlyMorning = new Date(Date.UTC(2026, 2, 18, 23, 8, 0));
    const sc2 = new Schedule(
      new ScheduleId("SC2"),
      new Weekdays(true, true, true, true, true, true, true),
      new DateRange("2026-01-01", "2026-12-31"),
      [],
    );
    const crossTrip = new Trip(
      new TripId("TCX"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("24:16:00"), new TimeOfDay("24:16:00"), 1),
        new PassingTime(destId, new TimeOfDay("24:26:00"), new TimeOfDay("24:26:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findActiveOn: (date) => {
        if (date.getUTCDate() === 18) return Promise.resolve([makeSchedule()]);
        if (date.getUTCDate() === 17) return Promise.resolve([sc2]);
        return Promise.resolve([]);
      },
      findDeparturesFromStation: (_stationId, after) => {
        if (after.hours >= 24) return Promise.resolve([crossTrip]);
        return Promise.resolve([]);
      },
      hasServiceStarted: () => Promise.resolve(false),
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
    expect(result.data.departures).toHaveLength(1);
    // extendedCurrentTime = 24:08, departure at 24:16 → 8 min
    expect(result.data.departures[0]!.minutesRemaining).toBe(8);
  });

  it("should compute minutesRemaining correctly for a normal trip when service has started", async () => {
    // 06:30 Madrid (CET) = 05:30 UTC
    const morningStarted = new Date(Date.UTC(2026, 2, 19, 5, 30, 0));
    const trip715 = new Trip(
      new TripId("T715"),
      routeId,
      scheduleId,
      [
        new PassingTime(originId, new TimeOfDay("07:15:00"), new TimeOfDay("07:15:00"), 1),
        new PassingTime(destId, new TimeOfDay("07:25:00"), new TimeOfDay("07:25:00"), 2),
      ],
      "Direction A",
    );

    const { stationRepo, lineRepo, routeRepo, scheduleRepo, tripRepo, eventBus } = makeRepos({
      findByName: (name) =>
        Promise.resolve(name === "Xàtiva" ? origin : name === "Colón" ? destination : null),
      findDeparturesFromStation: () => Promise.resolve([trip715]),
      hasServiceStarted: () => Promise.resolve(true),
    });

    const useCase = new SearchNextDepartures(
      stationRepo,
      lineRepo,
      scheduleRepo,
      tripRepo,
      routeRepo,
      eventBus,
    );
    const result = await useCase.execute("Xàtiva", "Colón", morningStarted);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(1);
    // currentTime = 06:30, departure at 07:15 → 45 min
    expect(result.data.departures[0]!.minutesRemaining).toBe(45);
  });
});
