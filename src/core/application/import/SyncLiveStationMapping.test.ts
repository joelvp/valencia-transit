import { describe, it, expect, mock } from "bun:test";
import { SyncLiveStationMapping } from "./SyncLiveStationMapping";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LiveStationCatalog } from "@/core/domain/shared/LiveStationCatalog";
import type { LiveStationLinkRepository } from "@/core/domain/shared/LiveStationLinkRepository";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";
import { LiveStation } from "@/core/domain/shared/LiveStation";
import { LiveStationLink } from "@/core/domain/shared/LiveStationLink";
import { UnmatchedLiveStationReason } from "@/core/domain/shared/UnmatchedLiveStationReason";
import { NoLiveStationsMatchedError } from "@/core/domain/error/NoLiveStationsMatchedError";
import { StationId } from "@/core/domain/station/StationId";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";

const xativa = new StationLocation(39.4667, -0.3775);
const stations = [
  Station.create("S1", "Xàtiva", xativa),
  Station.create("S2", "Colón", new StationLocation(39.4699, -0.3707)),
];

function makeRepo(): StationRepository {
  return {
    findById: mock(() => Promise.resolve(null)),
    findByName: mock(() => Promise.resolve(null)),
    searchByName: mock(() => Promise.resolve([])),
    findAll: mock(() => Promise.resolve(stations)),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
    updateTransportTypes: mock(() => Promise.resolve()),
  };
}

function makeCatalog(liveStations: LiveStation[]): LiveStationCatalog {
  return { fetchAll: mock(() => Promise.resolve(liveStations)) };
}

function makeLinkRepo(): LiveStationLinkRepository {
  return {
    replaceAll: mock(() => Promise.resolve()),
    findLiveId: mock(() => Promise.resolve(null)),
  };
}

function makeTx(inside: { value: boolean }): TransactionManager {
  const run = {
    run: mock(async (work: () => Promise<unknown>) => {
      inside.value = true;
      try {
        return await work();
      } finally {
        inside.value = false;
      }
    }),
  };
  return run as unknown as TransactionManager;
}

describe("SyncLiveStationMapping", () => {
  it("should persist links inside the transaction and report coverage", async () => {
    const inside = { value: false };
    const linkRepo = makeLinkRepo();
    let insideAtWrite = false;
    linkRepo.replaceAll = mock(() => {
      insideAtWrite = inside.value;
      return Promise.resolve();
    });
    const catalog = makeCatalog([
      new LiveStation("10", "Xativa", xativa),
      new LiveStation("99", "Nowhere", xativa),
    ]);

    const report = await new SyncLiveStationMapping(
      makeRepo(),
      catalog,
      linkRepo,
      makeTx(inside),
    ).execute();

    expect(linkRepo.replaceAll).toHaveBeenCalledWith([
      new LiveStationLink(new StationId("S1"), "10"),
    ]);
    expect(insideAtWrite).toBe(true);
    expect(report.mappedCount).toBe(1);
    expect(report.unmatchedLiveStations.map((u) => [u.liveId, u.reason])).toEqual([
      ["99", UnmatchedLiveStationReason.NO_NAME_MATCH],
    ]);
    expect(report.unmatchedStations).toEqual(stations.slice(1));
    expect(report.hasIssues).toBe(true);
  });

  it("should throw and write nothing when no live station matches", async () => {
    const linkRepo = makeLinkRepo();
    const tx = makeTx({ value: false });
    const catalog = makeCatalog([new LiveStation("99", "Nowhere", xativa)]);

    const promise = new SyncLiveStationMapping(makeRepo(), catalog, linkRepo, tx).execute();

    expect(promise).rejects.toThrow(NoLiveStationsMatchedError);
    await promise.catch(() => {});
    expect(linkRepo.replaceAll).not.toHaveBeenCalled();
    expect(tx.run).not.toHaveBeenCalled();
  });

  it("should propagate catalog errors and write nothing", async () => {
    const linkRepo = makeLinkRepo();
    const tx = makeTx({ value: false });
    const catalog: LiveStationCatalog = { fetchAll: mock(() => Promise.reject(new Error("boom"))) };

    const promise = new SyncLiveStationMapping(makeRepo(), catalog, linkRepo, tx).execute();

    expect(promise).rejects.toThrow("boom");
    await promise.catch(() => {});
    expect(linkRepo.replaceAll).not.toHaveBeenCalled();
  });
});
