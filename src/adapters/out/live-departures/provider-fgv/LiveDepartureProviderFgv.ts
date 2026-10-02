import type { LiveDepartureProvider } from "@/core/domain/shared/LiveDepartureProvider";
import { LiveArrival } from "@/core/domain/shared/LiveArrival";
import { LineId } from "@/core/domain/line/LineId";
import type { LiveStationLinkRepository } from "@/core/domain/shared/LiveStationLinkRepository";
import type { StationId } from "@/core/domain/station/StationId";
import type { FgvApiClient, FgvPrevisionResponse } from "./FgvApiClient";

/** LiveDepartureProvider backed by FGV's app API — see ./NOTES.md. */
export class LiveDepartureProviderFgv implements LiveDepartureProvider {
  constructor(
    private readonly links: LiveStationLinkRepository,
    private readonly client: Pick<FgvApiClient, "fetchPrevisiones">,
  ) {}

  async findLiveArrivals(stationId: StationId, now: Date): Promise<LiveArrival[]> {
    // FGV returns seconds-remaining directly; `now` is unused here.
    void now;
    const liveId = await this.links.findLiveId(stationId);
    if (liveId === null) return [];

    const data = await this.client.fetchPrevisiones(Number(liveId));
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
