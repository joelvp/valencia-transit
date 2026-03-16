import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";

type StationRow = {
  id: string;
  feedId: string;
  name: string;
  latitude: number;
  longitude: number;
  transportType: string;
};

export class StationMother {
  static create(overrides: Partial<{ id: string; name: string; lat: number; lng: number }> = {}): Station {
    return Station.create(
      overrides.id ?? "ST1",
      overrides.name ?? "Colón",
      new StationLocation(overrides.lat ?? 39.47, overrides.lng ?? -0.37),
    );
  }

  static row(overrides: Partial<StationRow> = {}): StationRow {
    return {
      id: "ST1",
      feedId: "metrovalencia",
      name: "Colón",
      latitude: 39.47,
      longitude: -0.37,
      transportType: "metro",
      ...overrides,
    };
  }
}
