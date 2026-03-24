import type { RouteId } from "./RouteId.ts";
import type { LineId } from "../line/LineId.ts";
import type { RouteStation } from "./RouteStation.ts";

export class Route {
  constructor(
    readonly id: RouteId,
    readonly lineId: LineId,
    readonly stations: RouteStation[],
  ) {}

  equals(other: Route): boolean {
    return this.id.equals(other.id);
  }
}
