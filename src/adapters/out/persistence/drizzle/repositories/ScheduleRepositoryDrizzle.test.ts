import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { ScheduleRepositoryDrizzle } from "./ScheduleRepositoryDrizzle";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { schedules, scheduleExceptions } from "../schema";
import { createTestSetup } from "./test-db-helper";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

// SC1: active Mon–Fri within 2025, no exceptions
// SC2: active only on weekends within 2025
const scheduleRows = [
  {
    id: "SC1",
    feedId: FEED_ID,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
  },
  {
    id: "SC2",
    feedId: FEED_ID,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    sunday: true,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
  },
];

describe("ScheduleRepositoryDrizzle", () => {
  let repo: ScheduleRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new ScheduleRepositoryDrizzle(db);
    await db.insert(schedules).values(scheduleRows);
    // Exception: SC1 is removed on 2025-03-10 (a Monday)
    await db.insert(scheduleExceptions).values([
      { scheduleId: "SC1", feedId: FEED_ID, date: "2025-03-10", isActive: false },
    ]);
  });

  afterAll(async () => {
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
});
