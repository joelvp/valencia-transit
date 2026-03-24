import { describe, it, expect } from "bun:test";
import { BuildLines } from "./BuildLines.ts";
import { Route } from "../route/Route.ts";
import { RouteId } from "../route/RouteId.ts";
import { Trip } from "../trip/Trip.ts";
import { TripId } from "../trip/TripId.ts";
import { PassingTime } from "../trip/PassingTime.ts";
import { LineId } from "./LineId.ts";
import { StationId } from "../station/StationId.ts";
import { ScheduleId } from "../schedule/ScheduleId.ts";
import { TimeOfDay } from "../shared/TimeOfDay.ts";

const SCHEDULE = new ScheduleId("S1");
const TIME = new TimeOfDay("08:00:00");

function makePt(stationId: string, sequence: number): PassingTime {
  return new PassingTime(new StationId(stationId), TIME, TIME, sequence);
}

function makeRoute(routeId: string, lineId: string): Route {
  return new Route(new RouteId(routeId), new LineId(lineId), []);
}

function makeTrip(tripId: string, routeId: string, stationIds: string[]): Trip {
  const pts = stationIds.map((sid, idx) => makePt(sid, idx + 1));
  return new Trip(new TripId(tripId), new RouteId(routeId), SCHEDULE, pts);
}

describe("BuildLines", () => {
  it("should build a line from one route and one trip", () => {
    const routes = [makeRoute("R1", "1")];
    const trips = [makeTrip("T1", "R1", ["A", "B", "C"])];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    expect(line.id.value).toBe("1");
    expect(line.name.value).toBe("Línia 1");
    expect(line.stops).toHaveLength(3);
    expect(line.stops.map((s) => s.stationId.value)).toEqual(["A", "B", "C"]);
  });

  it("should assign the known color for line 4", () => {
    const routes = [makeRoute("R4", "4")];
    const trips = [makeTrip("T1", "R4", ["A", "B"])];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    expect(lines[0]!.color?.value).toBe("014A99");
  });

  it("should assign null color for unknown line id", () => {
    const routes = [makeRoute("R99", "99")];
    const trips = [makeTrip("T1", "R99", ["A", "B"])];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    expect(lines[0]!.color).toBeNull();
  });

  it("should exclude stations appearing in less than 15% of trips", () => {
    // 10 trips through A→B→C, only 1 trip through A→B→C→D
    // D appears in 1/11 ≈ 9% → should be excluded
    const routes = [makeRoute("R1", "1")];
    const mainTrips = Array.from({ length: 10 }, (_, i) =>
      makeTrip(`T${i}`, "R1", ["A", "B", "C"]),
    );
    const rareTrip = makeTrip("T10", "R1", ["A", "B", "C", "D"]);
    const trips = [...mainTrips, rareTrip];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    const stopIds = lines[0]!.stops.map((s) => s.stationId.value);
    expect(stopIds).not.toContain("D");
    expect(stopIds).toEqual(["A", "B", "C"]);
  });

  it("should include stations appearing in exactly 15% of trips", () => {
    // 10 trips: 8 through A→B→C, 2 through A→B→C→D
    // D appears in 2/10 = 20% → should be included
    const routes = [makeRoute("R1", "1")];
    const mainTrips = Array.from({ length: 8 }, (_, i) => makeTrip(`T${i}`, "R1", ["A", "B", "C"]));
    const branchTrips = Array.from({ length: 2 }, (_, i) =>
      makeTrip(`TB${i}`, "R1", ["A", "B", "C", "D"]),
    );
    const trips = [...mainTrips, ...branchTrips];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    const stopIds = lines[0]!.stops.map((s) => s.stationId.value);
    expect(stopIds).toContain("D");
  });

  it("should insert a branch station at the correct position", () => {
    // Reference trip (longest): A→B→C→D (4 stops)
    // Branch trip: A→B→X→C→D — X appears in 2/6 trips ≈ 33% (above threshold)
    // X should be inserted between B and C in the sequence
    const routes = [makeRoute("R1", "1")];
    const mainTrips = Array.from({ length: 4 }, (_, i) =>
      makeTrip(`T${i}`, "R1", ["A", "B", "C", "D"]),
    );
    const branchTrips = Array.from({ length: 2 }, (_, i) =>
      makeTrip(`TB${i}`, "R1", ["A", "B", "X", "C", "D"]),
    );
    const trips = [...mainTrips, ...branchTrips];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    const stopIds = lines[0]!.stops.map((s) => s.stationId.value);
    expect(stopIds).toContain("X");
    const xIdx = stopIds.indexOf("X");
    const bIdx = stopIds.indexOf("B");
    const cIdx = stopIds.indexOf("C");
    expect(xIdx).toBeGreaterThan(bIdx);
    expect(xIdx).toBeLessThan(cIdx);
  });

  it("should skip a line with no trips", () => {
    const routes = [makeRoute("R1", "1")];
    const trips: Trip[] = [];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    expect(lines).toHaveLength(0);
  });

  it("should build multiple lines from routes with different lineIds", () => {
    const routes = [makeRoute("R1", "1"), makeRoute("R2", "2")];
    const trips = [makeTrip("T1", "R1", ["A", "B"]), makeTrip("T2", "R2", ["C", "D"])];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    expect(lines).toHaveLength(2);
    const lineIds = lines.map((l) => l.id.value).sort();
    expect(lineIds).toEqual(["1", "2"]);
  });

  it("should assign correct sequential stop sequences", () => {
    const routes = [makeRoute("R1", "3")];
    const trips = [makeTrip("T1", "R1", ["A", "B", "C"])];

    const lines = BuildLines.fromRoutesAndTrips(routes, trips);

    const sequences = lines[0]!.stops.map((s) => s.sequence);
    expect(sequences).toEqual([1, 2, 3]);
  });
});
