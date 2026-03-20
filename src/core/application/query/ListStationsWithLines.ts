import type { Station } from "../../domain/station/Station.ts";
import type { Line } from "../../domain/line/Line.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";

export interface StationWithLines {
  station: Station;
  lines: Line[];
}

export class ListStationsWithLines {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly lineRepository: LineRepository,
  ) {}

  async execute(): Promise<StationWithLines[]> {
    const [stations, allLines] = await Promise.all([
      this.stationRepository.findAll(),
      this.lineRepository.findAll(),
    ]);

    const stationLinesMap = new Map<string, Line[]>();
    for (const line of allLines) {
      for (const stop of line.stops) {
        const key = stop.stationId.value;
        if (!stationLinesMap.has(key)) {
          stationLinesMap.set(key, []);
        }
        const existingLines = stationLinesMap.get(key)!;
        if (!existingLines.some((l) => l.id.equals(line.id))) {
          existingLines.push(line);
        }
      }
    }

    return stations.map((station) => ({
      station,
      lines: stationLinesMap.get(station.id.value) ?? [],
    }));
  }
}
