import type { RouteId } from "./RouteId";
import type { LineId } from "@/core/domain/line/LineId";
import type { RouteStation } from "./RouteStation";
import type { TransportType } from "@/core/domain/shared/TransportType";

export class Route {
  constructor(
    readonly id: RouteId,
    readonly lineId: LineId,
    readonly stations: RouteStation[],
    readonly transportType: TransportType,
  ) {}

  equals(other: Route): boolean {
    return this.id.equals(other.id);
  }
}
