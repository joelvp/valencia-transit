import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { Schedule } from "@/core/domain/schedule/Schedule";
import type { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { ScheduleMapper } from "@/adapters/out/persistence/drizzle/mappers/ScheduleMapper";
import { schedules, scheduleExceptions } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { bulkInsert } from "@/adapters/out/persistence/drizzle/bulkInsert";

export class ScheduleRepositoryDrizzle implements ScheduleRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findById(id: ScheduleId): Promise<Schedule | null> {
    const scheduleRows = await this.db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id.value));
    if (!scheduleRows[0]) return null;

    const scheduleRow = scheduleRows[0];
    const exceptionRows = await this.db
      .select()
      .from(scheduleExceptions)
      .where(eq(scheduleExceptions.scheduleId, id.value));

    return ScheduleMapper.toDomain(scheduleRow, exceptionRows);
  }

  async findActiveOn(date: Date): Promise<Schedule[]> {
    const scheduleRows = await this.db.select().from(schedules);

    const allSchedules = await Promise.all(
      scheduleRows.map(async (scheduleRow) => {
        const exceptionRows = await this.db
          .select()
          .from(scheduleExceptions)
          .where(eq(scheduleExceptions.scheduleId, scheduleRow.id));
        return ScheduleMapper.toDomain(scheduleRow, exceptionRows);
      }),
    );

    return allSchedules.filter((schedule) => schedule.isActiveOn(date));
  }

  async save(schedule: Schedule, feedId: string): Promise<void> {
    const { schedule: scheduleRow, scheduleExceptions: exceptionRows } =
      ScheduleMapper.toPersistence(schedule, feedId);

    await this.db
      .insert(schedules)
      .values(scheduleRow)
      .onConflictDoUpdate({
        target: [schedules.id, schedules.feedId],
        set: {
          monday: scheduleRow.monday,
          tuesday: scheduleRow.tuesday,
          wednesday: scheduleRow.wednesday,
          thursday: scheduleRow.thursday,
          friday: scheduleRow.friday,
          saturday: scheduleRow.saturday,
          sunday: scheduleRow.sunday,
          startDate: scheduleRow.startDate,
          endDate: scheduleRow.endDate,
        },
      });

    if (exceptionRows.length > 0) {
      await this.db
        .insert(scheduleExceptions)
        .values(exceptionRows)
        .onConflictDoUpdate({
          target: [scheduleExceptions.scheduleId, scheduleExceptions.date, scheduleExceptions.feedId],
          set: { isActive: scheduleExceptions.isActive },
        });
    }
  }

  async saveAll(scheduleList: Schedule[], feedId: string): Promise<void> {
    const allScheduleRows = [];
    const allExceptionRows = [];
    for (const schedule of scheduleList) {
      const { schedule: scheduleRow, scheduleExceptions: exceptionRows } =
        ScheduleMapper.toPersistence(schedule, feedId);
      allScheduleRows.push(scheduleRow);
      allExceptionRows.push(...exceptionRows);
    }
    await bulkInsert(this.db, schedules, allScheduleRows);
    await bulkInsert(this.db, scheduleExceptions, allExceptionRows);
  }

  async deleteByFeedId(feedId: string): Promise<void> {
    await this.db.delete(schedules).where(eq(schedules.feedId, feedId));
  }
}
