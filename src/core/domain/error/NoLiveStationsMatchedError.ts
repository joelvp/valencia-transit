import { DomainError } from "./DomainError";

export class NoLiveStationsMatchedError extends DomainError {
  readonly code = "NO_LIVE_STATIONS_MATCHED";

  constructor(liveCount: number, ourCount: number) {
    super(
      `Live sync matched 0 of ${liveCount} live stations (ours: ${ourCount}); previous mapping kept`,
    );
  }
}
