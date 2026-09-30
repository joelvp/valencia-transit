import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LiveStationMapping } from "@/core/domain/shared/LiveStationMapping";
import type { LiveStationMappingReport } from "@/core/domain/shared/LiveStationMappingReport";

export class SyncLiveStationMapping {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly liveStationMapping: LiveStationMapping,
  ) {}

  async execute(): Promise<LiveStationMappingReport> {
    const stations = await this.stationRepository.findAll();
    return this.liveStationMapping.sync(stations);
  }
}
