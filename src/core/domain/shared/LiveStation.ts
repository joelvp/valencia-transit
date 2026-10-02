import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";
import type { StationLocation } from "@/core/domain/station/StationLocation";

// A station as a live-data provider knows it. Null location = unusable provider coordinates.
export class LiveStation {
  constructor(
    readonly liveId: string,
    readonly name: string,
    readonly location: StationLocation | null,
  ) {
    if (liveId.trim() === "") throw new InvalidArgumentError("LiveStation liveId is empty");
    if (name.trim() === "") throw new InvalidArgumentError("LiveStation name is empty");
  }
}
