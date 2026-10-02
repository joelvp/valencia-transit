import { describe, it, expect } from "bun:test";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";
import { StationId } from "@/core/domain/station/StationId";
import { LiveStationLink } from "./LiveStationLink";

describe("LiveStationLink", () => {
  it("should create with a station id and live id", () => {
    const link = new LiveStationLink(new StationId("S1"), "10");

    expect(link.stationId.value).toBe("S1");
    expect(link.liveId).toBe("10");
  });

  it("should throw on empty liveId", () => {
    expect(() => new LiveStationLink(new StationId("S1"), "  ")).toThrow(InvalidArgumentError);
  });
});
