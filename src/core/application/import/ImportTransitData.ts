import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { RouteRepository } from "../../domain/route/RouteRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { ScheduleRepository } from "../../domain/schedule/ScheduleRepository.ts";
import type { TripRepository } from "../../domain/trip/TripRepository.ts";
import type { EventBus } from "../../domain/event/EventBus.ts";
import type { GtfsData } from "../../domain/shared/GtfsData.ts";
import { DatasetImported } from "../../domain/event/DatasetImported.ts";

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

    // Delete in FK-safe order:
    // passing_times → line_stations → trips → route_stations → routes → lines → schedule_exceptions → schedules → stations
    // (cascade handles child tables, but explicit order for readability)
    console.log(`[import] Clearing existing data...`);
    await this.tripRepository.deleteByFeedId(feedId); // cascades passing_times + line_stations via trips FK? No — line_stations refs lines, not trips
    await this.lineRepository.deleteByFeedId(feedId); // cascades line_stations
    await this.routeRepository.deleteByFeedId(feedId); // cascades route_stations
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

    console.log(`[import] Importing ${data.lines.length} lines...`);
    await this.lineRepository.saveMany(data.lines, feedId);
    console.log(`[import] Lines done.`);

    console.log(`[import] Importing ${data.routes.length} routes...`);
    await this.routeRepository.saveMany(data.routes, feedId);
    console.log(`[import] Routes done.`);

    console.log(`[import] Importing ${data.trips.length} trips...`);
    await this.tripRepository.saveAll(data.trips, feedId);
    console.log(`[import] Trips done.`);

    await this.eventBus.publish(
      new DatasetImported(
        feedId,
        data.stations.length,
        data.lines.length,
        data.schedules.length,
        data.trips.length,
      ),
    );

    return {
      feedId,
      stationsImported: data.stations.length,
      routesImported: data.routes.length,
      linesImported: data.lines.length,
      schedulesImported: data.schedules.length,
      tripsImported: data.trips.length,
    };
  }
}
