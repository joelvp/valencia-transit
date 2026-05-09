import type { Trip } from "./Trip";
import type { RouteId } from "@/core/domain/route/RouteId";
import type { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import type { StationId } from "@/core/domain/station/StationId";
import type { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

export interface TripRepository {
  findByRouteAndSchedule(routeId: RouteId, scheduleId: ScheduleId): Promise<Trip[]>;
  findDeparturesFromStation(
    stationId: StationId,
    after: TimeOfDay,
    activeScheduleIds: ScheduleId[],
  ): Promise<Trip[]>;
  hasServiceStarted(
    stationId: StationId,
    before: TimeOfDay,
    activeScheduleIds: ScheduleId[],
  ): Promise<boolean>;
  save(trip: Trip, feedId: string): Promise<void>;
  saveAll(trips: Trip[], feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
