import type { LiveDepartureProvider } from "@/core/domain/shared/LiveDepartureProvider";
import { LiveArrival } from "@/core/domain/shared/LiveArrival";
import { LineId } from "@/core/domain/line/LineId";
import type { StationId } from "@/core/domain/station/StationId";
import type { FgvApiClient, FgvPrevisionResponse } from "./FgvApiClient";
import type { FgvStationIdStore } from "./FgvStationIdStore";

/** LiveDepartureProvider backed by FGV's app API — see ./NOTES.md. */
export class LiveDepartureProviderFgv implements LiveDepartureProvider {
  constructor(
    private readonly store: FgvStationIdStore,
    private readonly client: Pick<FgvApiClient, "fetchPrevisiones">,
    private readonly feedId: string,
  ) {}

  async findLiveArrivals(stationId: StationId, now: Date): Promise<LiveArrival[]> {
    // `now` is part of the port signature (other providers may need it) but FGV's endpoint
    // already returns seconds-remaining directly, so this adapter has no use for it.
    void now;
    const fgvStationId = await this.store.findFgvStationId(stationId, this.feedId);
    if (fgvStationId === null) return [];

    const data = await this.client.fetchPrevisiones(fgvStationId);
    return this.toLiveArrivals(data);
  }

  /** No FGV vocabulary (seconds, previsiones, vehicle) leaks past this point. */
  private toLiveArrivals(data: FgvPrevisionResponse): LiveArrival[] {
    const arrivals: LiveArrival[] = [];
    for (const group of data.previsiones ?? []) {
      for (const train of group.trains ?? []) {
        const lineNumber = train.line_id ?? group.line_id ?? group.line;
        if (lineNumber === undefined || lineNumber === null) continue;

        arrivals.push(
          new LiveArrival(
            new LineId(String(lineNumber)),
            train.destino ?? null,
            train.seconds / 60,
          ),
        );
      }
    }
    return arrivals;
  }
}
