import type { Line } from "../../domain/line/Line.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";

export interface LineStation {
  name: string;
  sequence: number;
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

    const stationNames = new Map<string, string>();
    for (const station of stations) {
      stationNames.set(station.id.value, station.name.value);
    }

    const lineStations: LineStation[] = line.stops
      .map((stop) => ({
        name: stationNames.get(stop.stationId.value) ?? stop.stationId.value,
        sequence: stop.sequence,
      }))
      .sort((a, b) => a.sequence - b.sequence);

    return { line, stations: lineStations };
  }
}
