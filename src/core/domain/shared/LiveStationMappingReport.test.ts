import { describe, it, expect } from "bun:test";
import { LiveStationMappingReport } from "./LiveStationMappingReport";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

describe("LiveStationMappingReport", () => {
  it("should expose its values", () => {
    const r = new LiveStationMappingReport(3, ["X"], ["Y too far"]);
    expect(r.mappedCount).toBe(3);
    expect(r.unmatched).toEqual(["X"]);
    expect(r.lowConfidence).toEqual(["Y too far"]);
  });

  it("should report no issues when both lists are empty", () => {
    expect(new LiveStationMappingReport(2, [], []).hasIssues).toBe(false);
  });

  it("should report issues when unmatched is non-empty", () => {
    expect(new LiveStationMappingReport(2, ["X"], []).hasIssues).toBe(true);
  });

  it("should report issues when lowConfidence is non-empty", () => {
    expect(new LiveStationMappingReport(2, [], ["Y"]).hasIssues).toBe(true);
  });

  it("should reject a negative or non-integer mappedCount", () => {
    expect(() => new LiveStationMappingReport(-1, [], [])).toThrow(InvalidArgumentError);
    expect(() => new LiveStationMappingReport(1.5, [], [])).toThrow(InvalidArgumentError);
  });
});
