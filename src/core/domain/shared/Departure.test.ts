import { describe, it, expect } from "bun:test";
import { Departure } from "./Departure.ts";
import { TimeOfDay } from "./TimeOfDay.ts";
import { LineDirection } from "../line/LineDirection.ts";

describe("Departure", () => {
  it("should calculate minutes remaining", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:00:00"),
    );
    expect(departure.minutesRemaining).toBe(30);
  });

  it("should return zero when departure is now", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L5",
      LineDirection.INBOUND,
      new TimeOfDay("14:30:00"),
    );
    expect(departure.minutesRemaining).toBe(0);
  });

  it("should return negative when departure is in the past", () => {
    const departure = new Departure(
      new TimeOfDay("14:00:00"),
      "L3",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:30:00"),
    );
    expect(departure.minutesRemaining).toBe(-30);
  });

  it("should store line name and direction", () => {
    const departure = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:00:00"),
    );
    expect(departure.lineName).toBe("L3");
    expect(departure.direction).toBe(LineDirection.OUTBOUND);
  });

  it("should be equal when departure time, line and direction match", () => {
    const a = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:00:00"),
    );
    const b = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:10:00"),
    );
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when line differs", () => {
    const a = new Departure(
      new TimeOfDay("14:30:00"),
      "L3",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:00:00"),
    );
    const b = new Departure(
      new TimeOfDay("14:30:00"),
      "L5",
      LineDirection.OUTBOUND,
      new TimeOfDay("14:00:00"),
    );
    expect(a.equals(b)).toBe(false);
  });
});
