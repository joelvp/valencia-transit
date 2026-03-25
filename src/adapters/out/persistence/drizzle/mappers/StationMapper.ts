import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { TransportType } from "@/core/domain/shared/TransportType";

type StationRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  transportTypes: string[] | null;
};

type StationInsert = {
  id: string;
  feedId: string;
  name: string;
  latitude: number;
  longitude: number;
  transportTypes: string[] | null;
};

export const StationMapper = {
  toDomain(row: StationRow): Station {
    const location = new StationLocation(row.latitude, row.longitude);
    const transportTypes = (row.transportTypes ?? []).map((s) => new TransportType(s));
    return Station.create(row.id, row.name, location, transportTypes);
  },

  toPersistence(station: Station, feedId: string): StationInsert {
    const types = station.transportTypes.map((t) => t.value);
    return {
      id: station.id.value,
      feedId,
      name: station.name.value,
      latitude: station.location.latitude,
      longitude: station.location.longitude,
      transportTypes: types.length > 0 ? types : null,
    };
  },
};
