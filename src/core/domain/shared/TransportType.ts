import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

const VALID_TYPES = ["metro", "tram", "bus", "train"] as const;
type TransportTypeValue = (typeof VALID_TYPES)[number];

export class TransportType {
  readonly value: TransportTypeValue;

  constructor(value: string) {
    if (!VALID_TYPES.includes(value as TransportTypeValue)) {
      throw new InvalidArgumentError(
        `Invalid transport type "${value}". Must be one of: ${VALID_TYPES.join(", ")}`,
      );
    }
    this.value = value as TransportTypeValue;
  }

  equals(other: TransportType): boolean {
    return this.value === other.value;
  }

  static readonly METRO = new TransportType("metro");
  static readonly TRAM = new TransportType("tram");
  static readonly BUS = new TransportType("bus");
  static readonly TRAIN = new TransportType("train");

  /**
   * Maps GTFS route_type to TransportType.
   * 0 = Tram, 1 = Metro, 2 = Rail, 3 = Bus
   */
  static fromGtfsRouteType(routeType: string): TransportType {
    switch (routeType) {
      case "0":
        return TransportType.TRAM;
      case "1":
        return TransportType.METRO;
      case "2":
        return TransportType.TRAIN;
      case "3":
        return TransportType.BUS;
      default:
        return TransportType.METRO;
    }
  }
}
