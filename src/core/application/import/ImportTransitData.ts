import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { ScheduleRepository } from "../../domain/schedule/ScheduleRepository.ts";
import type { TripRepository } from "../../domain/trip/TripRepository.ts";
import type { EventBus } from "../../domain/event/EventBus.ts";
import type { GtfsData } from "../../domain/shared/GtfsData.ts";
import { DatasetImported } from "../../domain/event/DatasetImported.ts";

export interface ImportSummary {
  feedId: string;
  stationsImported: number;
  linesImported: number;
  schedulesImported: number;
  tripsImported: number;
}

export class ImportTransitData {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly lineRepository: LineRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly tripRepository: TripRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(data: GtfsData, feedId: string): Promise<ImportSummary> {
    // Delete in dependency order: trips first (FK to lines/schedules), then lines/schedules, then stations
    await this.tripRepository.deleteByFeedId(feedId);
    await this.lineRepository.deleteByFeedId(feedId);
    await this.scheduleRepository.deleteByFeedId(feedId);
    await this.stationRepository.deleteByFeedId(feedId);

    for (const station of data.stations) {
      await this.stationRepository.save(station, feedId);
    }

    for (const line of data.lines) {
      await this.lineRepository.save(line, feedId);
    }

    for (const schedule of data.schedules) {
      await this.scheduleRepository.save(schedule, feedId);
    }

    for (const trip of data.trips) {
      await this.tripRepository.save(trip, feedId);
    }

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
      linesImported: data.lines.length,
      schedulesImported: data.schedules.length,
      tripsImported: data.trips.length,
    };
  }
}
