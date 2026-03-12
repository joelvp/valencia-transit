import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { PassingTime } from "@/core/domain/trip/PassingTime";
import { LineId } from "@/core/domain/line/LineId";
import { LineDirection } from "@/core/domain/line/LineDirection";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

type TripRow = {
  id: string;
  lineId: string;
  scheduleId: string;
  direction: string;
};

type PassingTimeRow = {
  tripId: string;
  stationId: string;
  arrivalTime: string;
  departureTime: string;
  sequence: number;
};

type TripInsert = {
  id: string;
  feedId: string;
  lineId: string;
  scheduleId: string;
  direction: string;
  headsign: string | null;
};

type PassingTimeInsert = {
  tripId: string;
  stationId: string;
  feedId: string;
  arrivalTime: string;
  departureTime: string;
  sequence: number;
};

type TripPersistenceResult = {
  trip: TripInsert;
  passingTimes: PassingTimeInsert[];
};

function parseDirection(raw: string): LineDirection {
  if (raw === LineDirection.OUTBOUND) return LineDirection.OUTBOUND;
  if (raw === LineDirection.INBOUND) return LineDirection.INBOUND;
  throw new InvalidArgumentError(`Unknown LineDirection: "${raw}"`);
}

export const TripMapper = {
  toDomain(row: TripRow, passingTimeRows: PassingTimeRow[]): Trip {
    const direction = parseDirection(row.direction);

    const passingTimes = passingTimeRows.map(
      (pt) =>
        new PassingTime(
          new StationId(pt.stationId),
          new TimeOfDay(pt.arrivalTime),
          new TimeOfDay(pt.departureTime),
          pt.sequence,
        ),
    );

    return new Trip(
      new TripId(row.id),
      new LineId(row.lineId),
      new ScheduleId(row.scheduleId),
      direction,
      passingTimes,
    );
  },

  toPersistence(trip: Trip, feedId: string): TripPersistenceResult {
    const tripInsert: TripInsert = {
      id: trip.id.value,
      feedId,
      lineId: trip.lineId.value,
      scheduleId: trip.scheduleId.value,
      direction: trip.direction,
      headsign: null,
    };

    const passingTimes: PassingTimeInsert[] = trip.passingTimes.map((pt) => ({
      tripId: trip.id.value,
      stationId: pt.stationId.value,
      feedId,
      arrivalTime: pt.arrivalTime.value,
      departureTime: pt.departureTime.value,
      sequence: pt.sequence,
    }));

    return { trip: tripInsert, passingTimes };
  },
};
