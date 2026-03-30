import { describe, it, expect } from "bun:test";
import { LineStop } from "./LineStop";
import { StationId } from "@/core/domain/station/StationId";

describe("LineStop", () => {
  it("should be equal to another LineStop with the same stationId and sequence", () => {
    const a = new LineStop(new StationId("S1"), 1);
    const b = new LineStop(new StationId("S1"), 1);
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when stationIds differ", () => {
    const a = new LineStop(new StationId("S1"), 1);
    const b = new LineStop(new StationId("S2"), 1);
    expect(a.equals(b)).toBe(false);
  });

  it("should not be equal when sequences differ", () => {
    const a = new LineStop(new StationId("S1"), 1);
    const b = new LineStop(new StationId("S1"), 2);
    expect(a.equals(b)).toBe(false);
  });

  it("should not be equal when both stationId and sequence differ", () => {
    const a = new LineStop(new StationId("S1"), 1);
    const b = new LineStop(new StationId("S2"), 2);
    expect(a.equals(b)).toBe(false);
  });
});
