import { describe, it, expect } from "bun:test";
import { UnmatchedLiveStation } from "./UnmatchedLiveStation";
import { UnmatchedLiveStationReason } from "./UnmatchedLiveStationReason";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

describe("UnmatchedLiveStation", () => {
  it("should hold name, liveId and reason", () => {
    const u = new UnmatchedLiveStation("Xàtiva", "12", UnmatchedLiveStationReason.TOO_FAR);
    expect(u.name).toBe("Xàtiva");
    expect(u.liveId).toBe("12");
    expect(u.reason).toBe(UnmatchedLiveStationReason.TOO_FAR);
  });

  it("should throw on empty name", () => {
    expect(() => new UnmatchedLiveStation(" ", "12", UnmatchedLiveStationReason.DUPLICATE)).toThrow(
      InvalidArgumentError,
    );
  });

  it("should throw on empty liveId", () => {
    expect(
      () => new UnmatchedLiveStation("Xàtiva", "", UnmatchedLiveStationReason.NO_NAME_MATCH),
    ).toThrow(InvalidArgumentError);
  });
});
