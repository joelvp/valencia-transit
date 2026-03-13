import { eq, and, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { Line } from "@/core/domain/line/Line";
import type { LineId } from "@/core/domain/line/LineId";
import type { StationId } from "@/core/domain/station/StationId";
import { LineMapper } from "@/adapters/out/persistence/drizzle/mappers/LineMapper";
import { lines, lineStations } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class LineRepositoryDrizzle implements LineRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findById(id: LineId): Promise<Line | null> {
    const lineRows = await this.db.select().from(lines).where(eq(lines.id, id.value));
    if (!lineRows[0]) return null;

    const lineRow = lineRows[0];
    const stopRows = await this.db
      .select()
      .from(lineStations)
      .where(and(eq(lineStations.lineId, id.value), eq(lineStations.feedId, lineRow.feedId)));

    return LineMapper.toDomain(lineRow, stopRows);
  }

  async findByStations(origin: StationId, destination: StationId): Promise<Line[]> {
    const originRows = await this.db
      .select({ lineId: lineStations.lineId, feedId: lineStations.feedId })
      .from(lineStations)
      .where(eq(lineStations.stationId, origin.value));

    if (originRows.length === 0) return [];

    const destRows = await this.db
      .select({ lineId: lineStations.lineId, feedId: lineStations.feedId })
      .from(lineStations)
      .where(eq(lineStations.stationId, destination.value));

    const destSet = new Set(destRows.map((r) => `${r.lineId}|${r.feedId}`));
    const matchingLineIds = originRows
      .filter((r) => destSet.has(`${r.lineId}|${r.feedId}`))
      .map((r) => r.lineId);

    if (matchingLineIds.length === 0) return [];

    const lineRows = await this.db
      .select()
      .from(lines)
      .where(inArray(lines.id, matchingLineIds));

    return Promise.all(
      lineRows.map(async (lineRow) => {
        const stopRows = await this.db
          .select()
          .from(lineStations)
          .where(
            and(eq(lineStations.lineId, lineRow.id), eq(lineStations.feedId, lineRow.feedId)),
          );
        return LineMapper.toDomain(lineRow, stopRows);
      }),
    );
  }

  async findAll(): Promise<Line[]> {
    const lineRows = await this.db.select().from(lines);

    return Promise.all(
      lineRows.map(async (lineRow) => {
        const stopRows = await this.db
          .select()
          .from(lineStations)
          .where(
            and(eq(lineStations.lineId, lineRow.id), eq(lineStations.feedId, lineRow.feedId)),
          );
        return LineMapper.toDomain(lineRow, stopRows);
      }),
    );
  }
}
