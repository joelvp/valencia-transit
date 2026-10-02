import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";
import type { UnmatchedLiveStationReason } from "./UnmatchedLiveStationReason";

// A provider station that could not be mapped to one of ours.
export class UnmatchedLiveStation {
  constructor(
    readonly name: string,
    readonly liveId: string,
    readonly reason: UnmatchedLiveStationReason,
  ) {
    if (name.trim() === "") throw new InvalidArgumentError("UnmatchedLiveStation name is empty");
    if (liveId.trim() === "")
      throw new InvalidArgumentError("UnmatchedLiveStation liveId is empty");
  }
}
