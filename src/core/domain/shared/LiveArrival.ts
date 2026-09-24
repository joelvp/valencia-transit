import type { LineId } from "@/core/domain/line/LineId";

/** A live arrival fact from an external provider. Provider-agnostic on purpose — no operator-specific vocabulary. */
export class LiveArrival {
  constructor(
    readonly lineId: LineId,
    readonly headsign: string | null,
    readonly minutesRemaining: number,
  ) {}
}
