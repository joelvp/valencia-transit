import type { Line } from "@/core/domain/line/Line";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LineStationsViewed } from "@/core/domain/event/LineStationsViewed";

export interface LineStation {
  id: string;
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
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    lineId: string,
    userId?: string,
    traceId?: string,
  ): Promise<GetLineStationsResult | null> {
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
          id: stop.stationId.value,
          name: info?.name ?? stop.stationId.value,
          sequence: stop.sequence,
          latitude: info?.latitude ?? 0,
          longitude: info?.longitude ?? 0,
        };
      })
      .sort((a, b) => a.sequence - b.sequence);

    void this.eventBus.publish(new LineStationsViewed(line.id.value, userId, traceId));

    return { line, stations: lineStations };
  }
}
