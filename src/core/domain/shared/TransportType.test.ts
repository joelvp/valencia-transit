import { describe, it, expect } from "bun:test";
import { TransportType } from "./TransportType";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

describe("TransportType", () => {
  describe("constructor", () => {
    it("should accept valid values", () => {
      expect(new TransportType("metro").value).toBe("metro");
      expect(new TransportType("tram").value).toBe("tram");
      expect(new TransportType("bus").value).toBe("bus");
      expect(new TransportType("train").value).toBe("train");
    });

    it("should throw InvalidArgumentError for invalid values", () => {
      expect(() => new TransportType("ferry")).toThrow(InvalidArgumentError);
      expect(() => new TransportType("")).toThrow(InvalidArgumentError);
      expect(() => new TransportType("Metro")).toThrow(InvalidArgumentError);
    });
  });

  describe("equals", () => {
    it("should return true for same transport type", () => {
      expect(new TransportType("metro").equals(new TransportType("metro"))).toBe(true);
    });

    it("should return false for different transport types", () => {
      expect(new TransportType("metro").equals(new TransportType("tram"))).toBe(false);
    });
  });

  describe("static constants", () => {
    it("should have correct values", () => {
      expect(TransportType.METRO.value).toBe("metro");
      expect(TransportType.TRAM.value).toBe("tram");
      expect(TransportType.BUS.value).toBe("bus");
      expect(TransportType.TRAIN.value).toBe("train");
    });
  });

  describe("fromGtfsRouteType", () => {
    it("should map 0 to TRAM", () => {
      expect(TransportType.fromGtfsRouteType("0").equals(TransportType.TRAM)).toBe(true);
    });

    it("should map 1 to METRO", () => {
      expect(TransportType.fromGtfsRouteType("1").equals(TransportType.METRO)).toBe(true);
    });

    it("should map 2 to TRAIN", () => {
      expect(TransportType.fromGtfsRouteType("2").equals(TransportType.TRAIN)).toBe(true);
    });

    it("should map 3 to BUS", () => {
      expect(TransportType.fromGtfsRouteType("3").equals(TransportType.BUS)).toBe(true);
    });

    it("should default to METRO for unknown route types", () => {
      expect(TransportType.fromGtfsRouteType("99").equals(TransportType.METRO)).toBe(true);
    });
  });
});
