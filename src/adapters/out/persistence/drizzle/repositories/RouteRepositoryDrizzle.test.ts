import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { eq } from "drizzle-orm";
import { createContainer, type Container } from "@/adapters/container";
import { clearDatabase, clearTables } from "tests/helpers/db";
import { RouteRepositoryDrizzle } from "./RouteRepositoryDrizzle";
import { Route } from "@/core/domain/route/Route";
import { RouteId } from "@/core/domain/route/RouteId";
import { LineId } from "@/core/domain/line/LineId";
import { StationId } from "@/core/domain/station/StationId";
import { RouteStation } from "@/core/domain/route/RouteStation";
import { TransportType } from "@/core/domain/shared/TransportType";
import { routes, routeStations, stations, lines } from "@/adapters/out/persistence/drizzle/schema";
import { StationMother } from "@/adapters/out/persistence/drizzle/repositories/mothers/StationMother";
import { RouteMother } from "@/adapters/out/persistence/drizzle/repositories/mothers/RouteMother";

const FEED_ID = "metrovalencia";

describe("RouteRepositoryDrizzle", () => {
  let container: Container;
  let repo: RouteRepositoryDrizzle;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearTables(container.db, "route_stations", "routes", "line_stations", "lines", "stations");
    repo = new RouteRepositoryDrizzle(container.db);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  describe("saveMany", () => {
    it("should save routes and their stations without error", async () => {
      await container.db.insert(stations).values([
        StationMother.row({ id: "ST1", name: "Colón" }),
        StationMother.row({ id: "ST2", name: "Xàtiva", longitude: -0.38 }),
      ]);
      await container.db
        .insert(lines)
        .values([{ id: "L1", feedId: FEED_ID, name: "1", color: null, transportType: "metro" }]);

      const route = new Route(
        new RouteId("R1"),
        new LineId("L1"),
        [new RouteStation(new StationId("ST1")), new RouteStation(new StationId("ST2"))],
        TransportType.METRO,
      );

      await repo.saveMany([route], FEED_ID);

      const savedRoutes = await container.db.select().from(routes);
      expect(savedRoutes).toHaveLength(1);
      expect(savedRoutes[0]!.id).toBe("R1");

      const savedStations = await container.db.select().from(routeStations);
      expect(savedStations).toHaveLength(2);
    });

    it("should handle empty array without error", async () => {
      await repo.saveMany([], FEED_ID);

      const savedRoutes = await container.db.select().from(routes);
      expect(savedRoutes).toHaveLength(0);
    });

    it("should not duplicate when saving the same route twice (onConflictDoNothing)", async () => {
      await container.db.insert(stations).values([StationMother.row({ id: "ST1" })]);
      await container.db
        .insert(lines)
        .values([{ id: "L1", feedId: FEED_ID, name: "1", color: null, transportType: "metro" }]);

      const route = new Route(
        new RouteId("R1"),
        new LineId("L1"),
        [new RouteStation(new StationId("ST1"))],
        TransportType.METRO,
      );

      await repo.saveMany([route], FEED_ID);
      await repo.saveMany([route], FEED_ID);

      const savedRoutes = await container.db.select().from(routes);
      expect(savedRoutes).toHaveLength(1);
    });
  });

  describe("findLineIdsByRouteIds", () => {
    beforeEach(async () => {
      await container.db.insert(lines).values([
        { id: "L1", feedId: FEED_ID, name: "1", color: null, transportType: "metro" },
        { id: "L2", feedId: FEED_ID, name: "2", color: null, transportType: "metro" },
      ]);
      await container.db.insert(routes).values([
        RouteMother.row({ id: "R1", feedId: FEED_ID }),
        RouteMother.row({ id: "R2", feedId: FEED_ID }),
      ]);
    });

    it("should return a map of routeId -> lineId for routes that have a lineId", async () => {
      await container.db.update(routes).set({ lineId: "L1" }).where(eq(routes.id, "R1"));
      await container.db.update(routes).set({ lineId: "L2" }).where(eq(routes.id, "R2"));

      const result = await repo.findLineIdsByRouteIds([new RouteId("R1"), new RouteId("R2")]);

      expect(result.size).toBe(2);
      expect(result.get("R1")).toBe("L1");
      expect(result.get("R2")).toBe("L2");
    });

    it("should return empty map when given an empty array", async () => {
      const result = await repo.findLineIdsByRouteIds([]);

      expect(result.size).toBe(0);
    });

    it("should return empty map when route ids do not exist", async () => {
      const result = await repo.findLineIdsByRouteIds([new RouteId("NONE")]);

      expect(result.size).toBe(0);
    });

    it("should omit routes with null lineId from the result", async () => {
      const result = await repo.findLineIdsByRouteIds([new RouteId("R1"), new RouteId("R2")]);

      expect(result.size).toBe(0);
    });
  });

  describe("deleteByFeedId", () => {
    it("should delete all routes for the given feedId", async () => {
      await container.db.insert(routes).values([
        RouteMother.row({ id: "R1", feedId: FEED_ID }),
        RouteMother.row({ id: "R2", feedId: FEED_ID }),
      ]);

      await repo.deleteByFeedId(FEED_ID);

      const remaining = await container.db.select().from(routes);
      expect(remaining).toHaveLength(0);
    });

    it("should not delete routes belonging to a different feedId", async () => {
      const OTHER_FEED = "other-feed";
      await container.db.insert(routes).values([
        RouteMother.row({ id: "R1", feedId: FEED_ID }),
        RouteMother.row({ id: "R1", feedId: OTHER_FEED }),
      ]);

      await repo.deleteByFeedId(FEED_ID);

      const remaining = await container.db.select().from(routes);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.feedId).toBe(OTHER_FEED);
    });
  });
});
