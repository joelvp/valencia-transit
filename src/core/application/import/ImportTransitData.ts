import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { RouteRepository } from "../../domain/route/RouteRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { ScheduleRepository } from "../../domain/schedule/ScheduleRepository.ts";
import type { TripRepository } from "../../domain/trip/TripRepository.ts";
import type { EventBus } from "../../domain/event/EventBus.ts";
import type { GtfsData } from "../../domain/shared/GtfsData.ts";
import { DatasetImported } from "../../domain/event/DatasetImported.ts";
import { BuildLines } from "../../domain/line/BuildLines.ts";
import { TransportType } from "../../domain/shared/TransportType.ts";

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
  ) {}

  async execute(data: GtfsData, feedId: string): Promise<ImportSummary> {
    console.log(`[import] Starting import for feed "${feedId}"...`);

    const lines = BuildLines.fromRoutesAndTrips(data.routes, data.trips);

    // Delete in FK-safe order:
    // trips (cascades passing_times) → routes (cascades route_stations, refs lines) → lines (cascades line_stations) → schedules → stations
    console.log(`[import] Clearing existing data...`);
    await this.tripRepository.deleteByFeedId(feedId);
    await this.routeRepository.deleteByFeedId(feedId);
    await this.lineRepository.deleteByFeedId(feedId);
    await this.scheduleRepository.deleteByFeedId(feedId);
    await this.stationRepository.deleteByFeedId(feedId);

    // Insert in FK-safe order:
    // stations → schedules + exceptions → lines → routes + route_stations → trips + passing_times → line_stations
    console.log(`[import] Importing ${data.stations.length} stations...`);
    await this.stationRepository.saveAll(data.stations, feedId);
    console.log(`[import] Stations done.`);

    console.log(`[import] Importing ${data.schedules.length} schedules...`);
    await this.scheduleRepository.saveAll(data.schedules, feedId);
    console.log(`[import] Schedules done.`);

    console.log(`[import] Importing ${lines.length} lines...`);
    await this.lineRepository.saveMany(lines, feedId);
    console.log(`[import] Lines done.`);

    console.log(`[import] Importing ${data.routes.length} routes...`);
    await this.routeRepository.saveMany(data.routes, feedId);
    console.log(`[import] Routes done.`);

    console.log(`[import] Importing ${data.trips.length} trips...`);
    await this.tripRepository.saveAll(data.trips, feedId);
    console.log(`[import] Trips done.`);

    // Post-process: derive station transport types from lines
    console.log(`[import] Updating station transport types from lines...`);
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
    console.log(`[import] Station transport types updated.`);

    await this.eventBus.publish(
      new DatasetImported(
        feedId,
        data.stations.length,
        lines.length,
        data.schedules.length,
        data.trips.length,
      ),
    );

    return {
      feedId,
      stationsImported: data.stations.length,
      routesImported: data.routes.length,
      linesImported: lines.length,
      schedulesImported: data.schedules.length,
      tripsImported: data.trips.length,
    };
  }
}
