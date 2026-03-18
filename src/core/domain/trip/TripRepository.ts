import type { Trip } from "./Trip.ts";
import type { LineId } from "../line/LineId.ts";
import type { ScheduleId } from "../schedule/ScheduleId.ts";
import type { StationId } from "../station/StationId.ts";
import type { TimeOfDay } from "../shared/TimeOfDay.ts";

export interface TripRepository {
  findByLineAndSchedule(lineId: LineId, scheduleId: ScheduleId): Promise<Trip[]>;
  findDeparturesFromStation(
    stationId: StationId,
    after: TimeOfDay,
    activeScheduleIds: ScheduleId[],
  ): Promise<Trip[]>;
  save(trip: Trip, feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
