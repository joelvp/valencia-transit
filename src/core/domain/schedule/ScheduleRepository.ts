import type { Schedule } from "./Schedule.ts";
import type { ScheduleId } from "./ScheduleId.ts";

export interface ScheduleRepository {
  findById(id: ScheduleId): Promise<Schedule | null>;
  findActiveOn(date: Date): Promise<Schedule[]>;
}
