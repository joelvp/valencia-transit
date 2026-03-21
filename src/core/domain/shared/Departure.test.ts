import { describe, it, expect } from "bun:test";
import { Departure } from "./Departure.ts";
import { TimeOfDay } from "./TimeOfDay.ts";

describe("Departure", () => {
  it("should calculate minutes remaining", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    expect(departure.minutesRemaining).toBe(30);
  });

  it("should return zero when departure is now", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L5",
      null,
      new TimeOfDay("14:30:00"),
    );
    expect(departure.minutesRemaining).toBe(0);
  });

  it("should return negative when departure is in the past", () => {
    const departure = new Departure(
      new TimeOfDay("14:00:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:30:00"),
    );
    expect(departure.minutesRemaining).toBe(-30);
  });

  it("should store line name", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      null,
      new TimeOfDay("14:00:00"),
    );
    expect(departure.lineName).toBe("L3");
  });

  it("should store headsign", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    expect(departure.headsign).toBe("Direction A");
  });

  it("should store null headsign", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      null,
      new TimeOfDay("14:00:00"),
    );
    expect(departure.headsign).toBeNull();
  });

  it("should be equal when departure time, line, and headsign match", () => {
    const a = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    const b = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:10:00"),
    );
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when line differs", () => {
    const a = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    const b = new Departure(
      new TimeOfDay("14:30:00"),
      "L5",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    expect(a.equals(b)).toBe(false);
  });

  it("should not be equal when headsign differs", () => {
    const a = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    const b = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction B",
      new TimeOfDay("14:00:00"),
    );
    expect(a.equals(b)).toBe(false);
  });

  it("should store lineColor when provided", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      null,
      new TimeOfDay("14:00:00"),
      "#FF0000",
    );
    expect(departure.lineColor).toBe("#FF0000");
  });

  it("should default lineColor and durationMinutes to null", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      null,
      new TimeOfDay("14:00:00"),
    );
    expect(departure.lineColor).toBeNull();
    expect(departure.durationMinutes).toBeNull();
  });

  it("should not be equal when one headsign is null and the other is not", () => {
    const a = new Departure(new TimeOfDay("14:30:00"), "L3", null, new TimeOfDay("14:00:00"));
    const b = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      "Direction A",
      new TimeOfDay("14:00:00"),
    );
    expect(a.equals(b)).toBe(false);
  });
});
