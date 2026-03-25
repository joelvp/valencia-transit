import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { TransportType } from "@/core/domain/shared/TransportType";

type StationRow = {
  id: string;
  feedId: string;
  name: string;
  latitude: number;
  longitude: number;
  transportTypes: string[] | null;
};

export class StationMother {
  static create(overrides: Partial<{ id: string; name: string; lat: number; lng: number }> = {}): Station {
    return Station.create(
      overrides.id ?? "ST1",
      overrides.name ?? "Colón",
      new StationLocation(overrides.lat ?? 39.47, overrides.lng ?? -0.37),
      [TransportType.METRO],
    );
  }

  static row(overrides: Partial<StationRow> = {}): StationRow {
    return {
      id: "ST1",
      feedId: "metrovalencia",
      name: "Colón",
      latitude: 39.47,
      longitude: -0.37,
      transportTypes: ["metro"],
      ...overrides,
    };
  }
}
