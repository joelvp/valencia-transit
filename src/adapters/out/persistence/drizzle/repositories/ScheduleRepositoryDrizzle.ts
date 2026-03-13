import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { Schedule } from "@/core/domain/schedule/Schedule";
import type { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { ScheduleMapper } from "@/adapters/out/persistence/drizzle/mappers/ScheduleMapper";
import { schedules, scheduleExceptions } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

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
}
