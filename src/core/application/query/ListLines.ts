import type { Line } from "@/core/domain/line/Line";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { StationRepository } from "@/core/domain/station/StationRepository";

export interface LineWithTerminals {
  line: Line;
  terminalFrom: string;
  terminalTo: string;
}

export class ListLines {
  constructor(
    private readonly lineRepository: LineRepository,
    private readonly stationRepository: StationRepository,
  ) {}

  async execute(): Promise<LineWithTerminals[]> {
    const [lines, stations] = await Promise.all([
      this.lineRepository.findAll(),
      this.stationRepository.findAll(),
    ]);

    const stationNames = new Map<string, string>();
    for (const station of stations) {
      stationNames.set(station.id.value, station.name.value);
    }

    const results: LineWithTerminals[] = [];

    for (const line of lines) {
      if (line.stops.length === 0) continue;

      const firstStop = line.stops[0]!;
      const lastStop = line.stops[line.stops.length - 1]!;

      const terminalFrom = stationNames.get(firstStop.stationId.value) ?? firstStop.stationId.value;
      const terminalTo = stationNames.get(lastStop.stationId.value) ?? lastStop.stationId.value;

      results.push({ line, terminalFrom, terminalTo });
    }

    return results.sort((a, b) => {
      const aNum = parseInt(a.line.id.value, 10);
      const bNum = parseInt(b.line.id.value, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.line.id.value.localeCompare(b.line.id.value);
    });
  }
}
