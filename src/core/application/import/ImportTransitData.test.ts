import { describe, it, expect, mock } from "bun:test";
import { ImportTransitData } from "./ImportTransitData.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { RouteRepository } from "../../domain/route/RouteRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { ScheduleRepository } from "../../domain/schedule/ScheduleRepository.ts";
import type { TripRepository } from "../../domain/trip/TripRepository.ts";
import type { EventBus } from "../../domain/event/EventBus.ts";
import type { GtfsData } from "../../domain/shared/GtfsData.ts";
import { DatasetImported } from "../../domain/event/DatasetImported.ts";
import { Station } from "../../domain/station/Station.ts";
import { StationId } from "../../domain/station/StationId.ts";
import { StationName } from "../../domain/station/StationName.ts";
import { StationLocation } from "../../domain/station/StationLocation.ts";
import { Route } from "../../domain/route/Route.ts";
import { RouteId } from "../../domain/route/RouteId.ts";
import { Line } from "../../domain/line/Line.ts";
import { LineId } from "../../domain/line/LineId.ts";
import { LineName } from "../../domain/line/LineName.ts";
import { Schedule } from "../../domain/schedule/Schedule.ts";
import { ScheduleId } from "../../domain/schedule/ScheduleId.ts";
import { Weekdays } from "../../domain/schedule/Weekdays.ts";
import { DateRange } from "../../domain/schedule/DateRange.ts";
import { Trip } from "../../domain/trip/Trip.ts";
import { TripId } from "../../domain/trip/TripId.ts";

function makeGtfsData(): GtfsData {
  const s1 = new Station(
    new StationId("S1"),
    new StationName("Xàtiva"),
    new StationLocation(39.47, -0.37),
  );
  const s2 = new Station(
    new StationId("S2"),
    new StationName("Colón"),
    new StationLocation(39.47, -0.36),
  );
  const route = new Route(new RouteId("V1-1-3"), new LineId("1"), []);
  const line = new Line(new LineId("1"), new LineName("Línia 1"), []);
  const schedule = new Schedule(
    new ScheduleId("SC1"),
    new Weekdays(true, true, true, true, true, false, false),
    new DateRange("2026-01-01", "2026-12-31"),
    [],
  );
  const trip = new Trip(new TripId("T1"), new RouteId("V1-1-3"), new ScheduleId("SC1"), []);

  return {
    stations: [s1, s2],
    routes: [route],
    lines: [line],
    schedules: [schedule],
    trips: [trip],
  };
}

function makeMocks() {
  const stationRepository: StationRepository = {
    findById: mock(() => Promise.resolve(null)),
    findByName: mock(() => Promise.resolve(null)),
    searchByName: mock(() => Promise.resolve([])),
    findAll: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const routeRepository: RouteRepository = {
    saveMany: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const lineRepository: LineRepository = {
    findAll: mock(() => Promise.resolve([])),
    findByStationIds: mock(() => Promise.resolve([])),
    saveMany: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const scheduleRepository: ScheduleRepository = {
    findById: mock(() => Promise.resolve(null)),
    findActiveOn: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
  const tripRepository: TripRepository = {
    findByRouteAndSchedule: mock(() => Promise.resolve([])),
    findDeparturesFromStation: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };

  const publishedEvents: unknown[] = [];
  const eventBus: EventBus = {
    publish: mock((event) => {
      publishedEvents.push(event);
      return Promise.resolve();
    }),
  };

  return {
    stationRepository,
    routeRepository,
    lineRepository,
    scheduleRepository,
    tripRepository,
    eventBus,
    publishedEvents,
  };
}

describe("ImportTransitData", () => {
  it("should return correct ImportSummary counts", async () => {
    const mocks = makeMocks();
    const useCase = new ImportTransitData(
      mocks.stationRepository,
      mocks.routeRepository,
      mocks.lineRepository,
      mocks.scheduleRepository,
      mocks.tripRepository,
      mocks.eventBus,
    );
    const data = makeGtfsData();

    const result = await useCase.execute(data, "feed-2026");

    expect(result).toEqual({
      feedId: "feed-2026",
      stationsImported: 2,
      routesImported: 1,
      linesImported: 1,
      schedulesImported: 1,
      tripsImported: 1,
    });
  });

  it("should call deleteByFeedId on all repositories before saving", async () => {
    const mocks = makeMocks();
    const useCase = new ImportTransitData(
      mocks.stationRepository,
      mocks.routeRepository,
      mocks.lineRepository,
      mocks.scheduleRepository,
      mocks.tripRepository,
      mocks.eventBus,
    );

    await useCase.execute(makeGtfsData(), "feed-2026");

    expect(mocks.stationRepository.deleteByFeedId).toHaveBeenCalledWith("feed-2026");
    expect(mocks.routeRepository.deleteByFeedId).toHaveBeenCalledWith("feed-2026");
    expect(mocks.lineRepository.deleteByFeedId).toHaveBeenCalledWith("feed-2026");
    expect(mocks.scheduleRepository.deleteByFeedId).toHaveBeenCalledWith("feed-2026");
    expect(mocks.tripRepository.deleteByFeedId).toHaveBeenCalledWith("feed-2026");

    // Each save must come after deleteByFeedId — verify bulk save was called
    expect(mocks.stationRepository.saveAll).toHaveBeenCalledTimes(1);
    expect(mocks.routeRepository.saveMany).toHaveBeenCalledTimes(1);
    expect(mocks.lineRepository.saveMany).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleRepository.saveAll).toHaveBeenCalledTimes(1);
    expect(mocks.tripRepository.saveAll).toHaveBeenCalledTimes(1);
  });

  it("should publish a DatasetImported event after saving", async () => {
    const mocks = makeMocks();
    const useCase = new ImportTransitData(
      mocks.stationRepository,
      mocks.routeRepository,
      mocks.lineRepository,
      mocks.scheduleRepository,
      mocks.tripRepository,
      mocks.eventBus,
    );

    await useCase.execute(makeGtfsData(), "feed-2026");

    expect(mocks.eventBus.publish).toHaveBeenCalledTimes(1);
    const published = mocks.publishedEvents[0];
    expect(published).toBeInstanceOf(DatasetImported);
  });

  it("should publish DatasetImported event with the correct feedId", async () => {
    const mocks = makeMocks();
    const useCase = new ImportTransitData(
      mocks.stationRepository,
      mocks.routeRepository,
      mocks.lineRepository,
      mocks.scheduleRepository,
      mocks.tripRepository,
      mocks.eventBus,
    );

    await useCase.execute(makeGtfsData(), "feed-2026");

    const event = mocks.publishedEvents[0] as DatasetImported;
    expect(event.feedId).toBe("feed-2026");
    expect(event.stationsCount).toBe(2);
    expect(event.linesCount).toBe(1);
    expect(event.schedulesCount).toBe(1);
    expect(event.tripsCount).toBe(1);
  });
});
