import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { RouteRepository } from "@/core/domain/route/RouteRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";
import type { GtfsData } from "@/core/domain/shared/GtfsData";
import { DatasetImported } from "@/core/domain/event/DatasetImported";
import { BuildLines } from "@/core/domain/line/BuildLines";
import { DeduplicateTrips } from "@/core/domain/trip/DeduplicateTrips";
import { TransportType } from "@/core/domain/shared/TransportType";
import type { Line } from "@/core/domain/line/Line";
import type { Trip } from "@/core/domain/trip/Trip";
import { createLogger } from "@/config/logger";

const log = createLogger("ImportTransitData");

export interface ImportSummary {
  feedId: string;
  stationsImported: number;
  routesImported: number;
  linesImported: number;
  schedulesImported: number;
  tripsImported: number;
}

export class ImportTransitData {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly routeRepository: RouteRepository,
    private readonly lineRepository: LineRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly tripRepository: TripRepository,
    private readonly eventBus: EventBus,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(data: GtfsData, feedId: string): Promise<ImportSummary> {
    log.info({ feedId }, "Starting import");

    const trips = DeduplicateTrips.removeTruncatedCopies(data.trips);
    const duplicatesRemoved = data.trips.length - trips.length;
    if (duplicatesRemoved > 0) {
      log.info({ duplicatesRemoved }, "Dropped truncated duplicate trips");
    }

    const lines = BuildLines.fromRoutesAndTrips(data.routes, trips);

    // All-or-nothing: a failure mid-import rolls back and keeps the previous feed intact.
    await this.transactionManager.run(() => this.replaceFeedData(data, trips, lines, feedId));

    // Published after commit, so subscribers never see a rolled-back import.
    await this.eventBus.publish(
      new DatasetImported(
        feedId,
        data.stations.length,
        lines.length,
        data.schedules.length,
        trips.length,
      ),
    );

    return {
      feedId,
      stationsImported: data.stations.length,
      routesImported: data.routes.length,
      linesImported: lines.length,
      schedulesImported: data.schedules.length,
      tripsImported: trips.length,
    };
  }

  private async replaceFeedData(
    data: GtfsData,
    trips: Trip[],
    lines: Line[],
    feedId: string,
  ): Promise<void> {
    // Delete in FK-safe order:
    // trips (cascades passing_times) → routes (cascades route_stations, refs lines) → lines (cascades line_stations) → schedules → stations
    log.info({ feedId }, "Clearing existing data");
    await this.tripRepository.deleteByFeedId(feedId);
    await this.routeRepository.deleteByFeedId(feedId);
    await this.lineRepository.deleteByFeedId(feedId);
    await this.scheduleRepository.deleteByFeedId(feedId);
    await this.stationRepository.deleteByFeedId(feedId);

    // Insert in FK-safe order:
    // stations → schedules + exceptions → lines → routes + route_stations → trips + passing_times → line_stations
    log.info({ count: data.stations.length }, "Importing stations");
    await this.stationRepository.saveAll(data.stations, feedId);
    log.info("Stations done");

    log.info({ count: data.schedules.length }, "Importing schedules");
    await this.scheduleRepository.saveAll(data.schedules, feedId);
    log.info("Schedules done");

    log.info({ count: lines.length }, "Importing lines");
    await this.lineRepository.saveMany(lines, feedId);
    log.info("Lines done");

    log.info({ count: data.routes.length }, "Importing routes");
    await this.routeRepository.saveMany(data.routes, feedId);
    log.info("Routes done");

    log.info({ count: trips.length }, "Importing trips");
    await this.tripRepository.saveAll(trips, feedId);
    log.info("Trips done");

    // Post-process: derive station transport types from lines
    log.info("Updating station transport types from lines");
    const transportTypesByStation = new Map<string, TransportType[]>();
    for (const line of lines) {
      for (const stop of line.stops) {
        const sid = stop.stationId.value;
        if (!transportTypesByStation.has(sid)) {
          transportTypesByStation.set(sid, []);
        }
        const types = transportTypesByStation.get(sid)!;
        if (!types.some((t) => t.equals(line.transportType))) {
          types.push(line.transportType);
        }
      }
    }
    await this.stationRepository.updateTransportTypes(transportTypesByStation, feedId);
    log.info("Station transport types updated");
  }
}
