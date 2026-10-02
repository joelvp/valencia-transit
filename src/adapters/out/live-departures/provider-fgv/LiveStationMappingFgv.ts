import type { LiveStationMapping } from "@/core/domain/shared/LiveStationMapping";
import { LiveStationMappingReport } from "@/core/domain/shared/LiveStationMappingReport";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";
import type { Station } from "@/core/domain/station/Station";
import type { FgvApiClient } from "./FgvApiClient";
import type { FgvStationMatcher } from "./FgvStationMatcher";
import { FgvStationMappingError } from "./FgvStationMappingError";
import type { FgvStationIdStore } from "./FgvStationIdStore";

/** Maps our stations to FGV's station ids and persists the result. */
export class LiveStationMappingFgv implements LiveStationMapping {
  constructor(
    private readonly client: Pick<FgvApiClient, "fetchStations">,
    private readonly matcher: FgvStationMatcher,
    private readonly store: FgvStationIdStore,
    private readonly transactionManager: TransactionManager,
    private readonly feedId: string,
  ) {}

  async sync(stations: Station[]): Promise<LiveStationMappingReport> {
    // Network call stays outside the transaction so it never holds a DB connection open.
    const fgvStations = await this.client.fetchStations();
    const { mappings, unmatchedLiveStations } = this.matcher.match(stations, fgvStations);

    // Never replace a working mapping with an empty one: live data would silently stop.
    if (mappings.length === 0) {
      throw new FgvStationMappingError(fgvStations.length, stations.length);
    }

    // Atomic: if the insert fails, the previous mapping stays in place.
    await this.transactionManager.run(() => this.store.saveAll(mappings, this.feedId));

    return new LiveStationMappingReport(
      mappings.map((m) => m.stationId),
      unmatchedLiveStations,
    );
  }
}
