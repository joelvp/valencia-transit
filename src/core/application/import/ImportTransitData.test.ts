import { describe, it, expect, mock } from "bun:test";
import { ImportTransitData } from "./ImportTransitData";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { RouteRepository } from "@/core/domain/route/RouteRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { GtfsData } from "@/core/domain/shared/GtfsData";
import { DatasetImported } from "@/core/domain/event/DatasetImported";
import { Station } from "@/core/domain/station/Station";
import { StationId } from "@/core/domain/station/StationId";
import { StationName } from "@/core/domain/station/StationName";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { Route } from "@/core/domain/route/Route";
import { RouteId } from "@/core/domain/route/RouteId";
import { LineId } from "@/core/domain/line/LineId";
import { TransportType } from "@/core/domain/shared/TransportType";
import { Schedule } from "@/core/domain/schedule/Schedule";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";
import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";

function makeGtfsData(): GtfsData {
  const s1 = new Station(
    new StationId("S1"),
    new StationName("Xàtiva"),
    new StationLocation(39.47, -0.37),
    [TransportType.METRO],
  );
  const s2 = new Station(
    new StationId("S2"),
    new StationName("Colón"),
    new StationLocation(39.47, -0.36),
    [TransportType.METRO],
  );
  const route = new Route(new RouteId("V1-1-3"), new LineId("1"), [], TransportType.METRO);
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
    updateTransportTypes: mock(() => Promise.resolve()),
  };
  const routeRepository: RouteRepository = {
    findLineIdsByRouteIds: mock(() => Promise.resolve(new Map())),
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
    hasServiceStarted: mock(() => Promise.resolve(false)),
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
