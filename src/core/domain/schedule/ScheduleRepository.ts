import type { Schedule } from "./Schedule";
import type { ScheduleId } from "./ScheduleId";
import type { ServiceDate } from "@/core/domain/shared/ServiceDate";

export interface ScheduleRepository {
  findById(id: ScheduleId): Promise<Schedule | null>;
  findActiveOn(serviceDate: ServiceDate): Promise<Schedule[]>;
  save(schedule: Schedule, feedId: string): Promise<void>;
  saveAll(schedules: Schedule[], feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
