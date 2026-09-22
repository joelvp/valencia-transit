import { describe, it, expect } from "bun:test";
import { ServiceDate } from "./ServiceDate";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

describe("ServiceDate", () => {
  it("should accept a YYYY-MM-DD value", () => {
    expect(new ServiceDate("2026-09-18").value).toBe("2026-09-18");
  });

  it("should reject a malformed value", () => {
    expect(() => new ServiceDate("18/09/2026")).toThrow(InvalidArgumentError);
    expect(() => new ServiceDate("2026-9-8")).toThrow(InvalidArgumentError);
  });

  describe("previous / next", () => {
    it("should move one day back and forward", () => {
      const date = new ServiceDate("2026-09-18");

      expect(date.previous().value).toBe("2026-09-17");
      expect(date.next().value).toBe("2026-09-19");
    });

    it("should cross a month boundary", () => {
      expect(new ServiceDate("2026-10-01").previous().value).toBe("2026-09-30");
      expect(new ServiceDate("2026-09-30").next().value).toBe("2026-10-01");
    });

    it("should cross a year boundary", () => {
      expect(new ServiceDate("2027-01-01").previous().value).toBe("2026-12-31");
      expect(new ServiceDate("2026-12-31").next().value).toBe("2027-01-01");
    });

    it("should handle a leap day", () => {
      expect(new ServiceDate("2028-03-01").previous().value).toBe("2028-02-29");
      expect(new ServiceDate("2028-02-29").next().value).toBe("2028-03-01");
    });

    it("should stay exact across a DST change", () => {
      // Spain moves the clock on the last Sunday of October
      expect(new ServiceDate("2026-10-25").previous().value).toBe("2026-10-24");
      expect(new ServiceDate("2026-10-24").next().value).toBe("2026-10-25");
    });
  });

  describe("equals", () => {
    it("should be equal to another date with the same value", () => {
      expect(new ServiceDate("2026-09-18").equals(new ServiceDate("2026-09-18"))).toBe(true);
    });

    it("should not be equal to a different date", () => {
      expect(new ServiceDate("2026-09-18").equals(new ServiceDate("2026-09-19"))).toBe(false);
    });
  });
});
