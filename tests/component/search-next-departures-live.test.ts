import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { createContainer, type Container } from "@/adapters/container";
import { LiveDepartureProviderFgv } from "@/adapters/out/live-departures/provider-fgv/LiveDepartureProviderFgv";
import {
  FgvApiClient,
  type FgvFetch,
} from "@/adapters/out/live-departures/provider-fgv/FgvApiClient";
import { clearDatabase } from "../helpers/db";
import { serviceInstant } from "../helpers/serviceTime";
import {
  stations,
  routes,
  lines,
  lineStations,
  schedules,
  scheduleExceptions,
  trips,
  passingTimes,
  fgvStationIds,
} from "@/adapters/out/persistence/drizzle/schema";

const FEED_ID = "FV1";
const LINK_FEED_ID = "metrovalencia"; // feed used by the container's FGV station-id repository
const FGV_ID = 42;
const TIMEOUT_MS = 50;
const NOW = serviceInstant("2024-06-03", "10:00:00");

// Scheduled Colón -> Xàtiva departures at 10:03, 10:08, ... 10:28
const SCHEDULED_MINUTES = [3, 8, 13, 18, 23, 28];

type PrevisionHandler = () => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function liveBody(secondsList: number[]) {
  return {
    previsiones: [
      {
        line: 1,
        line_id: 1,
        trains: secondsList.map((seconds) => ({ destino: "Xàtiva", seconds })),
      },
    ],
  };
}

describe("SearchNextDepartures + FGV live provider Component Test", () => {
  let container: Container;
  let previsionCalls: number;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearDatabase(container.db);
    previsionCalls = 0;

    await container.db.insert(stations).values([
      {
        id: "ST1",
        feedId: FEED_ID,
        name: "Colón",
        latitude: 39.4682,
        longitude: -0.3765,
        transportTypes: ["metro"],
      },
      {
        id: "ST2",
        feedId: FEED_ID,
        name: "Xàtiva",
        latitude: 39.4676,
        longitude: -0.3789,
        transportTypes: ["metro"],
      },
    ]);
    await container.db
      .insert(lines)
      .values([{ id: "1", feedId: FEED_ID, name: "Línia 1", transportType: "metro" }]);
    await container.db
      .insert(routes)
      .values([{ id: "R1", feedId: FEED_ID, transportType: "metro", lineId: "1" }]);
    await container.db.insert(lineStations).values([
      { lineId: "1", stationId: "ST1", feedId: FEED_ID, sequence: 1 },
      { lineId: "1", stationId: "ST2", feedId: FEED_ID, sequence: 2 },
    ]);
    await container.db.insert(schedules).values([
      {
        id: "WD",
        feedId: FEED_ID,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    ]);
    await container.db
      .insert(scheduleExceptions)
      .values([{ scheduleId: "WD", feedId: FEED_ID, date: "2024-06-03", isActive: true }]);

    await container.db.insert(trips).values(
      SCHEDULED_MINUTES.map((m) => ({
        id: `T${m}`,
        feedId: FEED_ID,
        routeId: "R1",
        scheduleId: "WD",
        headsign: "Xàtiva",
      })),
    );
    await container.db.insert(passingTimes).values(
      SCHEDULED_MINUTES.flatMap((m) => [
        {
          tripId: `T${m}`,
          stationId: "ST1",
          feedId: FEED_ID,
          arrivalTime: hhmmss(m),
          departureTime: hhmmss(m),
          sequence: 1,
        },
        {
          tripId: `T${m}`,
          stationId: "ST2",
          feedId: FEED_ID,
          arrivalTime: hhmmss(m + 5),
          departureTime: hhmmss(m + 5),
          sequence: 2,
        },
      ]),
    );

    await container.db
      .insert(fgvStationIds)
      .values([{ stationId: "ST1", feedId: LINK_FEED_ID, fgvStationId: FGV_ID }]);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  function hhmmss(minutesPastTen: number): string {
    const total = 10 * 60 + minutesPastTen;
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    return `${h}:${m}:00`;
  }

  /** Fake fetch: /estaciones primes the session, previsiones is delegated to `handler`. */
  function makeFetch(handler: PrevisionHandler): FgvFetch {
    return (url, init) => {
      if (url.endsWith("/estaciones")) {
        return Promise.resolve(
          new Response("[]", { status: 200, headers: { "set-cookie": "sid=abc; Path=/" } }),
        );
      }
      previsionCalls++;
      const signal = init?.signal;
      return new Promise<Response>((resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason));
        Promise.resolve(handler()).then(resolve, reject);
      });
    };
  }

  function buildUseCase(fetchFn: FgvFetch): SearchNextDepartures {
    const provider = new LiveDepartureProviderFgv(
      container.liveStationLinkRepository,
      new FgvApiClient(fetchFn, "https://fgv.test/api", TIMEOUT_MS),
    );
    return new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
      container.serviceCalendar,
      provider,
    );
  }

  async function search(fetchFn: FgvFetch) {
    const result = await buildUseCase(fetchFn).execute("Colón", "Xàtiva", NOW);
    expect(result.type).toBe("departures");
    if (result.type !== "departures") throw new Error("unreachable");
    return result.data.departures;
  }

  it("should return only live departures when live has at least 5", async () => {
    const departures = await search(makeFetch(() => json(liveBody([120, 300, 480, 660, 840]))));

    expect(departures.map((d) => d.source)).toEqual(["live", "live", "live", "live", "live"]);
    expect(departures.map((d) => Math.round(d.minutesRemaining))).toEqual([2, 5, 8, 11, 14]);
    expect(departures.every((d) => d.lineName === "1" && d.headsign === "Xàtiva")).toBe(true);
  });

  it("should top up with scheduled departures, ordered by time, when live has fewer than 5", async () => {
    const departures = await search(makeFetch(() => json(liveBody([120, 600]))));

    expect(departures.map((d) => d.source)).toEqual([
      "live",
      "live",
      "scheduled",
      "scheduled",
      "scheduled",
    ]);
    // Scheduled 10:03 and 10:08 are the live trains' counterparts and are pruned.
    expect(departures.slice(2).map((d) => d.departureTime.value)).toEqual([
      "10:13:00",
      "10:18:00",
      "10:23:00",
    ]);
    const minutes = departures.map((d) => d.minutesRemaining);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  describe("live failure falls back to scheduled only, without throwing", () => {
    async function expectScheduledOnly(fetchFn: FgvFetch) {
      const departures = await search(fetchFn);
      expect(departures).toHaveLength(5);
      expect(departures.every((d) => d.source === "scheduled")).toBe(true);
      expect(departures.map((d) => d.departureTime.value)).toEqual([
        "10:03:00",
        "10:08:00",
        "10:13:00",
        "10:18:00",
        "10:23:00",
      ]);
    }

    it("should fall back on an HTTP error", async () => {
      await expectScheduledOnly(makeFetch(() => json({ error: "boom" }, 500)));
      expect(previsionCalls).toBeGreaterThan(0);
    });

    it("should fall back when the request exceeds timeoutMs", async () => {
      const started = Date.now();
      await expectScheduledOnly(makeFetch(() => new Promise<Response>(() => {})));
      expect(Date.now() - started).toBeLessThan(2000);
      expect(previsionCalls).toBeGreaterThan(0);
    });

    it("should fall back on a network error", async () => {
      await expectScheduledOnly(makeFetch(() => Promise.reject(new TypeError("fetch failed"))));
    });

    it("should fall back on empty previsiones", async () => {
      await expectScheduledOnly(makeFetch(() => json({ previsiones: [] })));
      expect(previsionCalls).toBeGreaterThan(0);
    });

    it("should fall back without calling FGV when the station has no FGV id mapping", async () => {
      await container.db.delete(fgvStationIds);
      await expectScheduledOnly(makeFetch(() => json(liveBody([120]))));
      expect(previsionCalls).toBe(0);
    });
  });
});
