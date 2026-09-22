import { eq, and, gt, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { Trip } from "@/core/domain/trip/Trip";
import type { RouteId } from "@/core/domain/route/RouteId";
import type { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import type { StationId } from "@/core/domain/station/StationId";
import type { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { TripMapper } from "@/adapters/out/persistence/drizzle/mappers/TripMapper";
import { trips, passingTimes } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { bulkInsert } from "@/adapters/out/persistence/drizzle/bulkInsert";

export class TripRepositoryDrizzle implements TripRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findByRouteAndSchedule(routeId: RouteId, scheduleId: ScheduleId): Promise<Trip[]> {
    const tripRows = await this.db
      .select()
      .from(trips)
      .where(and(eq(trips.routeId, routeId.value), eq(trips.scheduleId, scheduleId.value)));

    if (tripRows.length === 0) return [];

    const allPassingTimeRows = await this.db
      .select()
      .from(passingTimes)
      .where(inArray(passingTimes.tripId, tripRows.map((r) => r.id)));

    const ptByTrip = new Map<string, typeof allPassingTimeRows>();
    for (const pt of allPassingTimeRows) {
      if (!ptByTrip.has(pt.tripId)) ptByTrip.set(pt.tripId, []);
      ptByTrip.get(pt.tripId)!.push(pt);
    }

    return tripRows.map((row) => TripMapper.toDomain(row, ptByTrip.get(row.id) ?? []));
  }

  async findDeparturesFromStation(
    stationId: StationId,
    after: TimeOfDay,
    activeScheduleIds: ScheduleId[],
  ): Promise<Trip[]> {
    if (activeScheduleIds.length === 0) return [];

    const scheduleIdValues = activeScheduleIds.map((id) => id.value);
    const ptOrigin = alias(passingTimes, "pt_origin");

    const rows = await this.db
      .select({
        tripId: trips.id,
        tripFeedId: trips.feedId,
        tripRouteId: trips.routeId,
        tripScheduleId: trips.scheduleId,
        tripHeadsign: trips.headsign,
        ptTripId: passingTimes.tripId,
        ptStationId: passingTimes.stationId,
        ptArrivalTime: passingTimes.arrivalTime,
        ptDepartureTime: passingTimes.departureTime,
        ptSequence: passingTimes.sequence,
      })
      .from(ptOrigin)
      .innerJoin(
        trips,
        and(eq(trips.id, ptOrigin.tripId), inArray(trips.scheduleId, scheduleIdValues)),
      )
      .innerJoin(passingTimes, eq(passingTimes.tripId, trips.id))
      .where(
        and(eq(ptOrigin.stationId, stationId.value), gt(ptOrigin.departureTime, after.value)),
      );

    if (rows.length === 0) return [];

    type TripRow = { id: string; routeId: string; scheduleId: string; headsign: string | null };
    type PtRow = {
      tripId: string;
      stationId: string;
      arrivalTime: string;
      departureTime: string;
      sequence: number;
    };

    const tripMap = new Map<string, TripRow>();
    const ptByTrip = new Map<string, PtRow[]>();

    for (const row of rows) {
      if (!tripMap.has(row.tripId)) {
        tripMap.set(row.tripId, {
          id: row.tripId,
          routeId: row.tripRouteId,
          scheduleId: row.tripScheduleId,
          headsign: row.tripHeadsign,
        });
      }
      if (!ptByTrip.has(row.ptTripId)) ptByTrip.set(row.ptTripId, []);
      ptByTrip.get(row.ptTripId)!.push({
        tripId: row.ptTripId,
        stationId: row.ptStationId,
        arrivalTime: row.ptArrivalTime,
        departureTime: row.ptDepartureTime,
        sequence: row.ptSequence,
      });
    }

    return [...tripMap.values()].map((tripRow) =>
      TripMapper.toDomain(tripRow, ptByTrip.get(tripRow.id) ?? []),
    );
  }

  async save(trip: Trip, feedId: string): Promise<void> {
    const { trip: tripRow, passingTimes: ptRows } = TripMapper.toPersistence(trip, feedId);

    await this.db
      .insert(trips)
      .values(tripRow)
      .onConflictDoUpdate({
        target: [trips.id, trips.feedId],
        set: {
          routeId: tripRow.routeId,
          scheduleId: tripRow.scheduleId,
          headsign: tripRow.headsign,
        },
      });

    if (ptRows.length > 0) {
      await this.db
        .insert(passingTimes)
        .values(ptRows)
        .onConflictDoUpdate({
          target: [
            passingTimes.tripId,
            passingTimes.stationId,
            passingTimes.sequence,
            passingTimes.feedId,
          ],
          set: {
            arrivalTime: passingTimes.arrivalTime,
            departureTime: passingTimes.departureTime,
          },
        });
    }
  }

  async saveAll(tripList: Trip[], feedId: string): Promise<void> {
    const allTripRows = [];
    const allPtRows = [];
    for (const trip of tripList) {
      const { trip: tripRow, passingTimes: ptRows } = TripMapper.toPersistence(trip, feedId);
      allTripRows.push(tripRow);
      allPtRows.push(...ptRows);
    }
    await bulkInsert(this.db, trips, allTripRows);
    await bulkInsert(this.db, passingTimes, allPtRows);
  }

  async deleteByFeedId(feedId: string): Promise<void> {
    await this.db.delete(trips).where(eq(trips.feedId, feedId));
  }
}
