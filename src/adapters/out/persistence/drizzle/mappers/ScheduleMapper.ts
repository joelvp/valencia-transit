import { Schedule } from "@/core/domain/schedule/Schedule";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";
import { ScheduleException } from "@/core/domain/schedule/ScheduleException";

type ScheduleRow = {
  id: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: string;
  endDate: string;
};

type ScheduleExceptionRow = {
  scheduleId: string;
  date: string;
  isActive: boolean;
};

type ScheduleInsert = {
  id: string;
  feedId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: string;
  endDate: string;
};

type ScheduleExceptionInsert = {
  scheduleId: string;
  feedId: string;
  date: string;
  isActive: boolean;
};

type SchedulePersistenceResult = {
  schedule: ScheduleInsert;
  scheduleExceptions: ScheduleExceptionInsert[];
};

export const ScheduleMapper = {
  toDomain(row: ScheduleRow, exceptionRows: ScheduleExceptionRow[]): Schedule {
    const weekdays = new Weekdays(
      row.monday,
      row.tuesday,
      row.wednesday,
      row.thursday,
      row.friday,
      row.saturday,
      row.sunday,
    );

    const dateRange = new DateRange(row.startDate, row.endDate);

    const exceptions = exceptionRows.map(
      (ex) => new ScheduleException(ex.date, ex.isActive),
    );

    return new Schedule(new ScheduleId(row.id), weekdays, dateRange, exceptions);
  },

  toPersistence(schedule: Schedule, feedId: string): SchedulePersistenceResult {
    const scheduleInsert: ScheduleInsert = {
      id: schedule.id.value,
      feedId,
      monday: schedule.weekdays.monday,
      tuesday: schedule.weekdays.tuesday,
      wednesday: schedule.weekdays.wednesday,
      thursday: schedule.weekdays.thursday,
      friday: schedule.weekdays.friday,
      saturday: schedule.weekdays.saturday,
      sunday: schedule.weekdays.sunday,
      startDate: schedule.dateRange.startDate,
      endDate: schedule.dateRange.endDate,
    };

    const scheduleExceptions: ScheduleExceptionInsert[] = schedule.exceptions.map((ex) => ({
      scheduleId: schedule.id.value,
      feedId,
      date: ex.date,
      isActive: ex.isActive,
    }));

    return { schedule: scheduleInsert, scheduleExceptions };
  },
};
