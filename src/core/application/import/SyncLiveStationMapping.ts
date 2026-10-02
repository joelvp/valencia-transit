import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LiveStationCatalog } from "@/core/domain/shared/LiveStationCatalog";
import type { LiveStationLinkRepository } from "@/core/domain/shared/LiveStationLinkRepository";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";
import { MatchLiveStations } from "@/core/domain/shared/MatchLiveStations";
import { LiveStationMappingReport } from "@/core/domain/shared/LiveStationMappingReport";
import { NoLiveStationsMatchedError } from "@/core/domain/error/NoLiveStationsMatchedError";

export class SyncLiveStationMapping {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly liveStationCatalog: LiveStationCatalog,
    private readonly liveStationLinkRepository: LiveStationLinkRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(): Promise<LiveStationMappingReport> {
    const stations = await this.stationRepository.findAll();
    // Network call stays outside the transaction so it never holds a DB connection open.
    const liveStations = await this.liveStationCatalog.fetchAll();

    const { links, unmatchedLiveStations } = MatchLiveStations.match(stations, liveStations);
    if (links.length === 0) {
      throw new NoLiveStationsMatchedError(liveStations.length, stations.length);
    }

    await this.transactionManager.run(() => this.liveStationLinkRepository.replaceAll(links));

    return new LiveStationMappingReport(
      links.map((l) => l.stationId),
      unmatchedLiveStations,
    ).withCoverageOf(stations);
  }
}
