import { describe, it, expect, mock } from "bun:test";
import { LiveDepartureProviderFgv } from "./LiveDepartureProviderFgv";
import { StationId } from "@/core/domain/station/StationId";
import type { FgvStationIdRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/FgvStationIdRepositoryDrizzle";

const FEED_ID = "metrovalencia";

function makeStationIdRepo(fgvStationId: number | null): FgvStationIdRepositoryDrizzle {
  return {
    findFgvStationId: mock(() => Promise.resolve(fgvStationId)),
  } as unknown as FgvStationIdRepositoryDrizzle;
}

function jsonResponse(
  body: unknown,
  init: { status?: number; setCookie?: string[] } = {},
): Response {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  for (const cookie of init.setCookie ?? []) {
    headers.append("set-cookie", cookie);
  }
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

const BOOTSTRAP_OK = () =>
  jsonResponse([], {
    setCookie: ["fgv_api_session=abc123; Path=/; HttpOnly", "XSRF-TOKEN=xyz789; Path=/"],
  });

const PREVISION_BODY = {
  previsiones: [
    {
      line: 1,
      line_id: 1,
      linea_id_interna: 42,
      trains: [{ destino: "Bétera", seconds: 120, vehicle: 1137, capacity: 397, line_id: 1 }],
    },
    {
      line: 9,
      line_id: 9,
      linea_id_interna: 50,
      trains: [
        { destino: "Alboraia Peris Aragó", seconds: 90, vehicle: 9107, capacity: 506, line_id: 9 },
      ],
    },
  ],
};

describe("LiveDepartureProviderFgv", () => {
  it("should return [] without any HTTP call when the station has no fgv mapping", async () => {
    const fetchFn = mock(() => Promise.resolve(jsonResponse({})));
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(null), FEED_ID, fetchFn);

    const result = await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(result).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("should prime a session before the first previsiones request", async () => {
    const calls: string[] = [];
    const fetchFn = mock((url: string) => {
      calls.push(url);
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(calls[0]).toContain("/estaciones");
    expect(calls[1]).toContain("horarios-prevision-3/78");
  });

  it("should reuse the session cookie across calls without re-bootstrapping", async () => {
    let bootstrapCalls = 0;
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) {
        bootstrapCalls++;
        return Promise.resolve(BOOTSTRAP_OK());
      }
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    await provider.findLiveArrivals(new StationId("ST1"), new Date());
    await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(bootstrapCalls).toBe(1);
  });

  it("should send the primed cookie on the previsiones request", async () => {
    let sentCookie: string | null = null;
    const fetchFn = mock((url: string, init?: Parameters<typeof fetch>[1]) => {
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      sentCookie = (init?.headers as Record<string, string> | undefined)?.["Cookie"] ?? null;
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(sentCookie as string | null).toBe("fgv_api_session=abc123; XSRF-TOKEN=xyz789");
  });

  it("should reset the session and retry exactly once when the previsiones request fails", async () => {
    let bootstrapCalls = 0;
    let previsionCalls = 0;
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) {
        bootstrapCalls++;
        return Promise.resolve(BOOTSTRAP_OK());
      }
      previsionCalls++;
      if (previsionCalls === 1) return Promise.resolve(jsonResponse({}, { status: 404 }));
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    const result = await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(bootstrapCalls).toBe(2);
    expect(previsionCalls).toBe(2);
    expect(result.length).toBe(2);
  });

  it("should throw when the retried request also fails", async () => {
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      return Promise.resolve(jsonResponse({}, { status: 500 }));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    await expect(provider.findLiveArrivals(new StationId("ST1"), new Date())).rejects.toThrow();
  });

  it("should map previsiones[].trains[] into domain-shaped LiveArrival entries", async () => {
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    const result = await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(result.length).toBe(2);
    expect(result[0]!.lineId.value).toBe("1");
    expect(result[0]!.headsign).toBe("Bétera");
    expect(result[0]!.minutesRemaining).toBe(2);
    expect(result[1]!.lineId.value).toBe("9");
    expect(result[1]!.headsign).toBe("Alboraia Peris Aragó");
    expect(result[1]!.minutesRemaining).toBe(1.5);
    // Only domain-shaped fields exist — no FGV vocabulary (vehicle, capacity, seconds) leaks out.
    expect(Object.keys(result[0]!)).toEqual(["lineId", "headsign", "minutesRemaining"]);
  });

  it("should resolve the fgv station id via the repository using the configured feedId", async () => {
    const stationIdRepo = makeStationIdRepo(78);
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(stationIdRepo, FEED_ID, fetchFn);
    const stationId = new StationId("ST1");

    await provider.findLiveArrivals(stationId, new Date());

    expect(stationIdRepo.findFgvStationId).toHaveBeenCalledWith(stationId, FEED_ID);
  });

  it("should not re-bootstrap on every call when FGV sets no session cookies", async () => {
    let bootstrapCalls = 0;
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) {
        bootstrapCalls++;
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const provider = new LiveDepartureProviderFgv(makeStationIdRepo(78), FEED_ID, fetchFn);

    await provider.findLiveArrivals(new StationId("ST1"), new Date());
    await provider.findLiveArrivals(new StationId("ST1"), new Date());

    expect(bootstrapCalls).toBe(1);
  });

  it("should abort and throw when FGV does not answer within the timeout", async () => {
    const hangingFetch = mock(
      (_url: string, init?: Parameters<typeof fetch>[1]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const provider = new LiveDepartureProviderFgv(
      makeStationIdRepo(78),
      FEED_ID,
      hangingFetch,
      undefined,
      20,
    );

    await expect(provider.findLiveArrivals(new StationId("ST1"), new Date())).rejects.toThrow();
  });
});
