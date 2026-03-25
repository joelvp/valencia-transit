import type { Line } from "../../domain/line/Line.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";

export interface LineStation {
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
}

export interface GetLineStationsResult {
  line: Line;
  stations: LineStation[];
}

export class GetLineStations {
  constructor(
    private readonly lineRepository: LineRepository,
    private readonly stationRepository: StationRepository,
  ) {}

  async execute(lineId: string): Promise<GetLineStationsResult | null> {
    const [lines, stations] = await Promise.all([
      this.lineRepository.findAll(),
      this.stationRepository.findAll(),
    ]);

    const line = lines.find((l) => l.id.value === lineId);
    if (!line) return null;

    const stationMap = new Map<string, { name: string; latitude: number; longitude: number }>();
    for (const station of stations) {
      stationMap.set(station.id.value, {
        name: station.name.value,
        latitude: station.location.latitude,
        longitude: station.location.longitude,
      });
    }

    const lineStations: LineStation[] = line.stops
      .map((stop) => {
        const info = stationMap.get(stop.stationId.value);
        return {
          name: info?.name ?? stop.stationId.value,
          sequence: stop.sequence,
          latitude: info?.latitude ?? 0,
          longitude: info?.longitude ?? 0,
        };
      })
      .sort((a, b) => a.sequence - b.sequence);

    return { line, stations: lineStations };
  }
}
