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

    const byName = new Map<string, StationWithLines>();
    for (const station of stations) {
      const name = station.name.value;
      const lines = stationLinesMap.get(station.id.value) ?? [];
      if (!byName.has(name)) {
        byName.set(name, { station, lines: [...lines] });
      } else {
        const existing = byName.get(name)!;
        for (const line of lines) {
          if (!existing.lines.some((l) => l.id.equals(line.id))) {
            existing.lines.push(line);
          }
        }
      }
    }

    return Array.from(byName.values()).sort((a, b) =>
      a.station.name.value.localeCompare(b.station.name.value, "es"),
    );
  }
}
