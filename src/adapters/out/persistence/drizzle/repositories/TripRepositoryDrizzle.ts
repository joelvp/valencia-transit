import { eq, and, gt, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { Trip } from "@/core/domain/trip/Trip";
import type { LineId } from "@/core/domain/line/LineId";
import type { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import type { StationId } from "@/core/domain/station/StationId";
import type { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { TripMapper } from "@/adapters/out/persistence/drizzle/mappers/TripMapper";
import { trips, passingTimes } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class TripRepositoryDrizzle implements TripRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findByLineAndSchedule(lineId: LineId, scheduleId: ScheduleId): Promise<Trip[]> {
    const tripRows = await this.db
      .select()
      .from(trips)
      .where(and(eq(trips.lineId, lineId.value), eq(trips.scheduleId, scheduleId.value)));

    return Promise.all(
      tripRows.map(async (tripRow) => {
        const passingTimeRows = await this.db
          .select()
          .from(passingTimes)
          .where(
            and(eq(passingTimes.tripId, tripRow.id), eq(passingTimes.feedId, tripRow.feedId)),
          );
        return TripMapper.toDomain(tripRow, passingTimeRows);
      }),
    );
  }

  async findDeparturesFromStation(
    stationId: StationId,
    after: TimeOfDay,
    activeScheduleIds: ScheduleId[],
  ): Promise<Trip[]> {
    if (activeScheduleIds.length === 0) return [];

    const scheduleIdValues = activeScheduleIds.map((id) => id.value);

    const matchingPassingTimes = await this.db
      .select()
      .from(passingTimes)
      .where(
        and(
          eq(passingTimes.stationId, stationId.value),
          gt(passingTimes.departureTime, after.value),
        ),
      );

    if (matchingPassingTimes.length === 0) return [];

    const tripIds = [...new Set(matchingPassingTimes.map((pt) => pt.tripId))];

    const tripRows = await this.db
      .select()
      .from(trips)
      .where(and(inArray(trips.id, tripIds), inArray(trips.scheduleId, scheduleIdValues)));

    return Promise.all(
      tripRows.map(async (tripRow) => {
        const passingTimeRows = await this.db
          .select()
          .from(passingTimes)
          .where(
            and(eq(passingTimes.tripId, tripRow.id), eq(passingTimes.feedId, tripRow.feedId)),
          );
        return TripMapper.toDomain(tripRow, passingTimeRows);
      }),
    );
  }
}
