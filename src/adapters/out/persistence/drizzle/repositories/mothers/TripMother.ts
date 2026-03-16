import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { LineId } from "@/core/domain/line/LineId";
import { LineDirection } from "@/core/domain/line/LineDirection";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import type { PassingTime } from "@/core/domain/trip/PassingTime";

type TripRow = {
  id: string;
  feedId: string;
  lineId: string;
  scheduleId: string;
  direction: string;
  headsign: string;
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
    overrides: Partial<{ id: string; lineId: string; scheduleId: string; passingTimes: PassingTime[] }> = {},
  ): Trip {
    return new Trip(
      new TripId(overrides.id ?? "TR1"),
      new LineId(overrides.lineId ?? "L1"),
      new ScheduleId(overrides.scheduleId ?? "SC1"),
      LineDirection.OUTBOUND,
      overrides.passingTimes ?? [],
    );
  }

  static row(overrides: Partial<TripRow> = {}): TripRow {
    return {
      id: "TR1",
      feedId: "metrovalencia",
      lineId: "L1",
      scheduleId: "SC1",
      direction: "OUTBOUND",
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
