import { describe, it, expect } from "bun:test";
import { StationMapper } from "./StationMapper";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";

describe("StationMapper", () => {
  describe("toDomain", () => {
    it("should convert a DB row to a Station domain entity", () => {
      const row = {
        id: "station-1",
        name: "Xàtiva",
        latitude: 39.4699,
        longitude: -0.3763,
      };

      const station = StationMapper.toDomain(row);

      expect(station.id.value).toBe("station-1");
      expect(station.name.value).toBe("Xàtiva");
      expect(station.location.latitude).toBe(39.4699);
      expect(station.location.longitude).toBe(-0.3763);
    });

    it("should return a Station instance", () => {
      const row = {
        id: "station-2",
        name: "Colón",
        latitude: 39.4702,
        longitude: -0.3756,
      };

      const station = StationMapper.toDomain(row);

      expect(station).toBeInstanceOf(Station);
    });
  });

  describe("toPersistence", () => {
    it("should convert a Station domain entity to a DB insert row", () => {
      const location = new StationLocation(39.4699, -0.3763);
      const station = Station.create("station-1", "Xàtiva", location);

      const row = StationMapper.toPersistence(station, "metrovalencia");

      expect(row.id).toBe("station-1");
      expect(row.feedId).toBe("metrovalencia");
      expect(row.name).toBe("Xàtiva");
      expect(row.latitude).toBe(39.4699);
      expect(row.longitude).toBe(-0.3763);
      expect(row.transportType).toBe("metro");
    });

    it("should always set transportType to metro", () => {
      const location = new StationLocation(39.4702, -0.3756);
      const station = Station.create("station-2", "Colón", location);

      const row = StationMapper.toPersistence(station, "metrovalencia");

      expect(row.transportType).toBe("metro");
    });
  });

  describe("round-trip", () => {
    it("should produce an equivalent entity after toPersistence and toDomain", () => {
      const location = new StationLocation(39.4699, -0.3763);
      const original = Station.create("station-1", "Xàtiva", location);

      const persisted = StationMapper.toPersistence(original, "metrovalencia");
      const restored = StationMapper.toDomain(persisted);

      expect(restored.id.value).toBe(original.id.value);
      expect(restored.name.value).toBe(original.name.value);
      expect(restored.location.latitude).toBe(original.location.latitude);
      expect(restored.location.longitude).toBe(original.location.longitude);
    });
  });
});
