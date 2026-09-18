import { describe, it, expect } from "bun:test";
import { DeduplicateTrips } from "./DeduplicateTrips";
import { Trip } from "./Trip";
import { TripId } from "./TripId";
import { PassingTime } from "./PassingTime";
import { RouteId } from "@/core/domain/route/RouteId";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

function run(id: string, stops: [station: string, time: string][], scheduleId = "SCH1"): Trip {
  const times = stops.map(
    ([station, time], index) =>
      new PassingTime(new StationId(station), new TimeOfDay(time), new TimeOfDay(time), index + 1),
  );
  return new Trip(new TripId(id), new RouteId("R1"), new ScheduleId(scheduleId), times);
}

const survivingIds = (trips: Trip[]) =>
  DeduplicateTrips.removeTruncatedCopies(trips)
    .map((t) => t.id.value)
    .sort();

const short = run("SHORT", [
  ["A", "22:00:00"],
  ["B", "22:10:00"],
]);
const long = run("LONG", [
  ["A", "22:00:00"],
  ["B", "22:10:00"],
  ["C", "22:20:00"],
]);

describe("DeduplicateTrips", () => {
  it("should drop the truncated copy and keep the trip reaching the terminus", () => {
    expect(survivingIds([short, long])).toEqual(["LONG"]);
  });

  it("should collapse a chain of truncated copies down to the longest", () => {
    const longest = run("LONGEST", [
      ["A", "22:00:00"],
      ["B", "22:10:00"],
      ["C", "22:20:00"],
      ["D", "22:30:00"],
    ]);

    expect(survivingIds([short, long, longest])).toEqual(["LONGEST"]);
  });

  it("should keep two different continuations of the same truncated start", () => {
    const viaD = run("VIA_D", [
      ["A", "22:00:00"],
      ["B", "22:10:00"],
      ["D", "22:25:00"],
    ]);

    expect(survivingIds([short, long, viaD])).toEqual(["LONG", "VIA_D"]);
  });

  it("should keep trips running the same stops on different service days", () => {
    const otherDay = run(
      "OTHER_DAY",
      [
        ["A", "22:00:00"],
        ["B", "22:10:00"],
        ["C", "22:20:00"],
      ],
      "SCH2",
    );

    expect(survivingIds([short, otherDay])).toEqual(["OTHER_DAY", "SHORT"]);
  });

  it("should leave trips untouched when none is a copy of another", () => {
    const later = run("LATER", [
      ["A", "23:00:00"],
      ["B", "23:10:00"],
    ]);

    expect(survivingIds([short, later])).toEqual(["LATER", "SHORT"]);
  });

  it("should ignore trips with no passing times", () => {
    const empty = new Trip(new TripId("EMPTY"), new RouteId("R1"), new ScheduleId("SCH1"), []);

    expect(survivingIds([short, long, empty])).toEqual(["EMPTY", "LONG"]);
  });
});
