import { describe, it, expect, mock } from "bun:test";
import { LiveDepartureProviderFgv } from "./LiveDepartureProviderFgv";
import type { FgvApiClient, FgvPrevisionResponse } from "./FgvApiClient";
import type { FgvStationIdStore } from "./FgvStationIdStore";
import { StationId } from "@/core/domain/station/StationId";

const FEED_ID = "metrovalencia";

const PREVISION_BODY: FgvPrevisionResponse = {
  previsiones: [
    { line: 1, line_id: 1, trains: [{ destino: "Bétera", seconds: 120, line_id: 1 }] },
    { line: 9, line_id: 9, trains: [{ destino: "Alboraia Peris Aragó", seconds: 90, line_id: 9 }] },
  ],
};

function makeStore(fgvStationId: number | null) {
  const findFgvStationId = mock<FgvStationIdStore["findFgvStationId"]>(() =>
    Promise.resolve(fgvStationId),
  );
  const store: FgvStationIdStore = { findFgvStationId, saveAll: () => Promise.resolve() };
  return { store, findFgvStationId };
}

function makeClient(body: FgvPrevisionResponse = PREVISION_BODY) {
  const fetchPrevisiones = mock<FgvApiClient["fetchPrevisiones"]>(() => Promise.resolve(body));
  return { client: { fetchPrevisiones }, fetchPrevisiones };
}

describe("LiveDepartureProviderFgv", () => {
  it("should return [] without any client call when the station has no fgv mapping", async () => {
    const { client, fetchPrevisiones } = makeClient();
    const provider = new LiveDepartureProviderFgv(makeStore(null).store, client, FEED_ID);

    const result = await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(result).toEqual([]);
    expect(fetchPrevisiones).not.toHaveBeenCalled();
  });

  it("should map previsiones[].trains[] into domain-shaped LiveArrival entries", async () => {
    const provider = new LiveDepartureProviderFgv(
      makeStore(78).store,
      makeClient().client,
      FEED_ID,
    );

    const result = await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(result.length).toBe(2);
    expect(result[0]!.lineId.value).toBe("1");
    expect(result[0]!.headsign).toBe("Bétera");
    expect(result[0]!.minutesRemaining).toBe(2);
    expect(result[1]!.lineId.value).toBe("9");
    expect(result[1]!.headsign).toBe("Alboraia Peris Aragó");
    expect(result[1]!.minutesRemaining).toBe(1.5);
    expect(Object.keys(result[0]!)).toEqual(["lineId", "headsign", "minutesRemaining"]);
  });

  it("should resolve the fgv station id via the store and query the client with it", async () => {
    const { store, findFgvStationId } = makeStore(78);
    const { client, fetchPrevisiones } = makeClient();
    const provider = new LiveDepartureProviderFgv(store, client, FEED_ID);
    const stationId = new StationId("ST1");

    await provider.findLiveArrivals(stationId, new Date());

    expect(findFgvStationId).toHaveBeenCalledWith(stationId, FEED_ID);
    expect(fetchPrevisiones).toHaveBeenCalledWith(78);
  });

  it("should fall back to the group line id when a train has no line_id", async () => {
    const body: FgvPrevisionResponse = {
      previsiones: [{ line: 3, line_id: 7, trains: [{ destino: null, seconds: 60 }] }],
    };
    const provider = new LiveDepartureProviderFgv(
      makeStore(78).store,
      makeClient(body).client,
      FEED_ID,
    );

    const result = await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(result).toHaveLength(1);
    expect(result[0]!.lineId.value).toBe("7");
    expect(result[0]!.headsign).toBeNull();
  });

  it("should return [] when FGV reports no previsiones", async () => {
    const body = { previsiones: [] } satisfies FgvPrevisionResponse;
    const provider = new LiveDepartureProviderFgv(
      makeStore(78).store,
      makeClient(body).client,
      FEED_ID,
    );

    expect(await provider.findLiveArrivals(new StationId("ST1"), new Date())).toEqual([]);
  });

  it("should propagate client failures", async () => {
    const client = { fetchPrevisiones: () => Promise.reject(new Error("boom")) };
    const provider = new LiveDepartureProviderFgv(makeStore(78).store, client, FEED_ID);

    await expect(provider.findLiveArrivals(new StationId("ST1"), new Date())).rejects.toThrow();
  });
});
