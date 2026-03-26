import { describe, it, expect } from "bun:test";
import { PassingTime } from "./PassingTime";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

function makePassingTime(opts?: {
  stationId?: string;
  arrivalTime?: string;
  departureTime?: string;
  sequence?: number;
}): PassingTime {
  return new PassingTime(
    new StationId(opts?.stationId ?? "S1"),
    new TimeOfDay(opts?.arrivalTime ?? "08:00:00"),
    new TimeOfDay(opts?.departureTime ?? "08:01:00"),
    opts?.sequence ?? 1,
  );
}

describe("PassingTime", () => {
  describe("equals", () => {
    it("should return true when all fields match", () => {
      const a = makePassingTime();
      const b = makePassingTime();
      expect(a.equals(b)).toBe(true);
    });

    it("should return false when stationId differs", () => {
      const a = makePassingTime();
      const b = makePassingTime({ stationId: "S2" });
      expect(a.equals(b)).toBe(false);
    });

    it("should return false when arrivalTime differs", () => {
      const a = makePassingTime();
      const b = makePassingTime({ arrivalTime: "09:00:00" });
      expect(a.equals(b)).toBe(false);
    });

    it("should return false when departureTime differs", () => {
      const a = makePassingTime();
      const b = makePassingTime({ departureTime: "09:01:00" });
      expect(a.equals(b)).toBe(false);
    });

    it("should return false when sequence differs", () => {
      const a = makePassingTime();
      const b = makePassingTime({ sequence: 2 });
      expect(a.equals(b)).toBe(false);
    });
  });
});
