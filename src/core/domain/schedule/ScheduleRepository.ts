import type { Schedule } from "./Schedule";
import type { ScheduleId } from "./ScheduleId";

export interface ScheduleRepository {
  findById(id: ScheduleId): Promise<Schedule | null>;
  findActiveOn(date: Date): Promise<Schedule[]>;
  save(schedule: Schedule, feedId: string): Promise<void>;
  saveAll(schedules: Schedule[], feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
