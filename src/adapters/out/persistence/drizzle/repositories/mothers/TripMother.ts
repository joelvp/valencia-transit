import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { RouteId } from "@/core/domain/route/RouteId";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import type { PassingTime } from "@/core/domain/trip/PassingTime";

type TripRow = {
  id: string;
  feedId: string;
  routeId: string;
  scheduleId: string;
  headsign: string | null;
};

type PassingTimeRow = {
  tripId: string;
  stationId: string;
  feedId: string;
  arrivalTime: string;
  departureTime: string;
  sequence: number;
};

export class TripMother {
  static create(
    overrides: Partial<{ id: string; routeId: string; scheduleId: string; passingTimes: PassingTime[] }> = {},
  ): Trip {
    return new Trip(
      new TripId(overrides.id ?? "TR1"),
      new RouteId(overrides.routeId ?? "R1"),
      new ScheduleId(overrides.scheduleId ?? "SC1"),
      overrides.passingTimes ?? [],
    );
  }

  static row(overrides: Partial<TripRow> = {}): TripRow {
    return {
      id: "TR1",
      feedId: "metrovalencia",
      routeId: "R1",
      scheduleId: "SC1",
      headsign: "Colón",
      ...overrides,
    };
  }

  static passingTimeRow(overrides: Partial<PassingTimeRow> = {}): PassingTimeRow {
    return {
      tripId: "TR1",
      stationId: "ST1",
      feedId: "metrovalencia",
      arrivalTime: "08:00:00",
      departureTime: "08:00:00",
      sequence: 1,
      ...overrides,
    };
  }
}
