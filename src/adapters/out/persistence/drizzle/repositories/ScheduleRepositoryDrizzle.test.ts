import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { ScheduleRepositoryDrizzle } from "./ScheduleRepositoryDrizzle";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { Schedule } from "@/core/domain/schedule/Schedule";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";
import { schedules, scheduleExceptions } from "../schema";
import { createTestSetup } from "./test-db-helper";
import { ScheduleMother } from "./mothers/ScheduleMother";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

// SC1: active Mon–Fri within 2025, no exceptions
// SC2: active only on weekends within 2025
describe("ScheduleRepositoryDrizzle", () => {
  let repo: ScheduleRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new ScheduleRepositoryDrizzle(db);
    await db.insert(schedules).values([ScheduleMother.row(), ScheduleMother.weekendRow()]);
    // Exception: SC1 is removed on 2025-03-10 (a Monday)
    await db.insert(scheduleExceptions).values([
      { scheduleId: "SC1", feedId: FEED_ID, date: "2025-03-10", isActive: false },
    ]);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  it("should return schedule with exceptions when found by id", async () => {
    const result = await repo.findById(new ScheduleId("SC1"));

    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("SC1");
    expect(result!.exceptions.length).toBe(1);
  });

  it("should return null when schedule id does not exist", async () => {
    const result = await repo.findById(new ScheduleId("NONE"));

    expect(result).toBeNull();
  });

  it("should return schedules active on a weekday (Monday 2025-03-03)", async () => {
    // 2025-03-03 is a Monday — SC1 (Mon–Fri) should match, SC2 (Sat–Sun) should not
    const monday = new Date("2025-03-03T12:00:00Z");
    const result = await repo.findActiveOn(monday);

    expect(result.length).toBe(1);
    expect(result[0]!.id.value).toBe("SC1");
  });

  it("should exclude schedule removed by exception on that date", async () => {
    // 2025-03-10 is a Monday but SC1 has an exception marking it inactive
    const mondayWithException = new Date("2025-03-10T12:00:00Z");
    const result = await repo.findActiveOn(mondayWithException);

    expect(result).toEqual([]);
  });

  it("should return empty array when no schedule matches the given date", async () => {
    // Out of range entirely
    const outOfRange = new Date("2030-01-01T12:00:00Z");
    const result = await repo.findActiveOn(outOfRange);

    expect(result).toEqual([]);
  });

  it("should insert schedule and allow retrieval after save", async () => {
    const schedule = new Schedule(
      new ScheduleId("SC3"),
      new Weekdays(true, false, false, false, false, false, false),
      new DateRange("2026-01-01", "2026-12-31"),
      [],
    );

    await repo.save(schedule, FEED_ID);

    const result = await repo.findById(new ScheduleId("SC3"));
    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("SC3");
    expect(result!.weekdays.monday).toBe(true);
    expect(result!.weekdays.tuesday).toBe(false);
  });

  it("should upsert without error when saving an already-existing schedule", async () => {
    const schedule = new Schedule(
      new ScheduleId("SC1"),
      new Weekdays(false, false, false, false, false, true, true),
      new DateRange("2025-01-01", "2025-12-31"),
      [],
    );

    await repo.save(schedule, FEED_ID);

    const result = await repo.findById(new ScheduleId("SC1"));
    expect(result).not.toBeNull();
    expect(result!.weekdays.monday).toBe(false);
    expect(result!.weekdays.saturday).toBe(true);
  });

  it("should remove all schedules for the given feedId", async () => {
    await repo.deleteByFeedId(FEED_ID);

    const rows = await db.select().from(schedules);
    expect(rows).toEqual([]);
  });

  it("should not remove schedules belonging to a different feedId", async () => {
    const OTHER_FEED = "other-feed";
    await db.insert(schedules).values([ScheduleMother.row({ id: "SCO1", feedId: OTHER_FEED })]);

    await repo.deleteByFeedId(FEED_ID);

    const rows = await db.select().from(schedules);
    expect(rows.length).toBe(1);
    expect(rows[0]!.feedId).toBe(OTHER_FEED);
  });
});
