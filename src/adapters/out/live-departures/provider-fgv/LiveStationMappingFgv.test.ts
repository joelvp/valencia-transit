import { describe, it, expect } from "bun:test";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import type { FgvStation } from "./FgvApiClient";
import { FgvStationMatcher } from "./FgvStationMatcher";
import type { FgvStationIdMapping, FgvStationIdStore } from "./FgvStationIdStore";
import { FgvStationMappingError } from "./FgvStationMappingError";
import { LiveStationMappingFgv } from "./LiveStationMappingFgv";

const FEED_ID = "feed-1";

function station(id: string, name: string): Station {
  return Station.create(id, name, new StationLocation(39.47, -0.37));
}

function fgvStation(id: number, nombre: string): FgvStation {
  return { estacion_id_FGV: id, nombre, latitud: 39.47, longitud: -0.37 };
}

function setup(options: { fetch?: () => Promise<FgvStation[]>; saveError?: Error } = {}) {
  const events: string[] = [];
  let depth = 0;
  const saved: { mappings: FgvStationIdMapping[]; feedId: string; insideRun: boolean }[] = [];

  const client = {
    fetchStations: async () => {
      events.push(depth > 0 ? "fetch:inside" : "fetch:outside");
      return options.fetch ? options.fetch() : [];
    },
  };
  const store: FgvStationIdStore = {
    findFgvStationId: async () => null,
    saveAll: async (mappings, feedId) => {
      events.push("saveAll");
      saved.push({ mappings, feedId, insideRun: depth > 0 });
      if (options.saveError) throw options.saveError;
    },
  };
  const transactionManager: TransactionManager = {
    run: async (work) => {
      depth++;
      try {
        return await work();
      } finally {
        depth--;
      }
    },
  };
  const mapping = new LiveStationMappingFgv(
    client,
    new FgvStationMatcher(),
    store,
    transactionManager,
    FEED_ID,
  );
  return { mapping, events, saved };
}

describe("LiveStationMappingFgv", () => {
  it("should save matched mappings with the feedId inside the transaction", async () => {
    const { mapping, saved } = setup({ fetch: async () => [fgvStation(10, "Colón")] });

    await mapping.sync([station("s1", "Colón")]);

    expect(saved).toHaveLength(1);
    expect(saved[0]!.feedId).toBe(FEED_ID);
    expect(saved[0]!.insideRun).toBe(true);
    expect(saved[0]!.mappings.map((m) => [m.stationId.value, m.fgvStationId])).toEqual([
      ["s1", 10],
    ]);
  });

  it("should fetch FGV stations outside the transaction", async () => {
    const { mapping, events } = setup({ fetch: async () => [fgvStation(10, "Colón")] });

    await mapping.sync([station("s1", "Colón")]);

    expect(events).toEqual(["fetch:outside", "saveAll"]);
  });

  it("should return a report reflecting mapped, unmatched and low confidence stations", async () => {
    const far: FgvStation = {
      estacion_id_FGV: 12,
      nombre: "Lejos",
      latitud: 39.6,
      longitud: -0.37,
    };
    const { mapping } = setup({
      fetch: async () => [fgvStation(10, "Colón"), fgvStation(11, "Nowhere"), far],
    });

    const report = await mapping.sync([station("s1", "Colón"), station("s2", "Lejos")]);

    expect(report.mappedCount).toBe(1);
    expect(report.unmatched).toEqual(["Nowhere"]);
    expect(report.lowConfidence).toHaveLength(1);
    expect(report.hasIssues).toBe(true);
  });

  it("should propagate fetch errors and never save", async () => {
    const { mapping, saved } = setup({
      fetch: async () => {
        throw new Error("network down");
      },
    });

    await expect(mapping.sync([station("s1", "Colón")])).rejects.toThrow("network down");
    expect(saved).toHaveLength(0);
  });

  it("should keep the previous mapping when nothing matches", async () => {
    const { mapping, saved } = setup({ fetch: async () => [fgvStation(10, "Colón")] });

    await expect(mapping.sync([])).rejects.toThrow(FgvStationMappingError);
    expect(saved).toHaveLength(0);
  });

  it("should propagate save errors", async () => {
    const { mapping } = setup({
      fetch: async () => [fgvStation(10, "Colón")],
      saveError: new Error("db failed"),
    });

    await expect(mapping.sync([station("s1", "Colón")])).rejects.toThrow("db failed");
  });
});
