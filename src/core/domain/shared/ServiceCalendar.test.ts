import { describe, it, expect } from "bun:test";
import { ServiceCalendar } from "./ServiceCalendar";

const madrid = new ServiceCalendar("Europe/Madrid");

describe("ServiceCalendar", () => {
  describe("serviceDateOf", () => {
    it("should match the UTC date during the day", () => {
      // 12:00 UTC = 14:00 Madrid (CEST) — same calendar day either way
      expect(madrid.serviceDateOf(new Date("2026-05-09T12:00:00Z")).value).toBe("2026-05-09");
    });

    it("should already be the next day right after Madrid midnight in summer", () => {
      // 22:00 UTC = 00:00 Madrid (CEST) — UTC still says the 9th
      expect(madrid.serviceDateOf(new Date("2026-05-09T22:00:00Z")).value).toBe("2026-05-10");
    });

    it("should already be the next day right after Madrid midnight in winter", () => {
      // 23:30 UTC = 00:30 Madrid (CET)
      expect(madrid.serviceDateOf(new Date("2026-01-09T23:30:00Z")).value).toBe("2026-01-10");
    });

    it("should agree with UTC again once UTC reaches midnight", () => {
      expect(madrid.serviceDateOf(new Date("2026-05-10T00:00:00Z")).value).toBe("2026-05-10");
    });
  });

  describe("timeOfDayOf", () => {
    it("should return the local wall clock time, not UTC", () => {
      // 22:05 UTC = 00:05 Madrid (CEST)
      expect(madrid.timeOfDayOf(new Date("2026-05-09T22:05:00Z")).value).toBe("00:05:00");
    });

    it("should return midnight as 00:00:00", () => {
      expect(madrid.timeOfDayOf(new Date("2026-05-09T22:00:00Z")).value).toBe("00:00:00");
    });

    it("should apply the winter offset", () => {
      // 23:30 UTC = 00:30 Madrid (CET)
      expect(madrid.timeOfDayOf(new Date("2026-01-09T23:30:00Z")).value).toBe("00:30:00");
    });
  });

  describe("other timezones", () => {
    it("should resolve a different configured timezone", () => {
      // Canary Islands run one hour behind mainland Spain
      const canary = new ServiceCalendar("Atlantic/Canary");
      const instant = new Date("2026-05-09T22:30:00Z");

      expect(madrid.serviceDateOf(instant).value).toBe("2026-05-10");
      expect(madrid.timeOfDayOf(instant).value).toBe("00:30:00");
      expect(canary.serviceDateOf(instant).value).toBe("2026-05-09");
      expect(canary.timeOfDayOf(instant).value).toBe("23:30:00");
    });
  });
});
