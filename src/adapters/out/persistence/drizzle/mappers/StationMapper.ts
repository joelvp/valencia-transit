import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";

type StationRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type StationInsert = {
  id: string;
  feedId: string;
  name: string;
  latitude: number;
  longitude: number;
  transportType: string;
};

export const StationMapper = {
  toDomain(row: StationRow): Station {
    const location = new StationLocation(row.latitude, row.longitude);
    return Station.create(row.id, row.name, location);
  },

  toPersistence(station: Station, feedId: string): StationInsert {
    return {
      id: station.id.value,
      feedId,
      name: station.name.value,
      latitude: station.location.latitude,
      longitude: station.location.longitude,
      transportType: "metro",
    };
  },
};
