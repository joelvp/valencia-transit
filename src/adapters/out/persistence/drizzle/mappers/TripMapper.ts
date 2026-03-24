import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { PassingTime } from "@/core/domain/trip/PassingTime";
import { RouteId } from "@/core/domain/route/RouteId";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

type TripRow = {
  id: string;
  routeId: string;
  scheduleId: string;
  headsign: string | null;
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
  routeId: string;
  scheduleId: string;
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

export const TripMapper = {
  toDomain(row: TripRow, passingTimeRows: PassingTimeRow[]): Trip {
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
      new RouteId(row.routeId),
      new ScheduleId(row.scheduleId),
      passingTimes,
      row.headsign,
    );
  },

  toPersistence(trip: Trip, feedId: string): TripPersistenceResult {
    const tripInsert: TripInsert = {
      id: trip.id.value,
      feedId,
      routeId: trip.routeId.value,
      scheduleId: trip.scheduleId.value,
      headsign: trip.headsign,
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
