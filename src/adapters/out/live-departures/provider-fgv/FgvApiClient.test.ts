import { describe, it, expect, mock } from "bun:test";
import { FgvApiClient } from "./FgvApiClient";
import { FgvApiError } from "./FgvApiError";

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

const BOOTSTRAP_COOKIES = {
  setCookie: ["fgv_api_session=abc123; Path=/; HttpOnly", "XSRF-TOKEN=xyz789; Path=/"],
};
const BOOTSTRAP_OK = () => jsonResponse([], BOOTSTRAP_COOKIES);

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

describe("FgvApiClient", () => {
  it("should prime a session before the first previsiones request", async () => {
    const calls: string[] = [];
    const fetchFn = mock((url: string) => {
      calls.push(url);
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const client = new FgvApiClient(fetchFn);

    await client.fetchPrevisiones(78);

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
    const client = new FgvApiClient(fetchFn);

    await client.fetchPrevisiones(78);
    await client.fetchPrevisiones(78);

    expect(bootstrapCalls).toBe(1);
  });

  it("should send the primed cookie on the previsiones request", async () => {
    let sentCookie: string | null = null;
    const fetchFn = mock((url: string, init?: Parameters<typeof fetch>[1]) => {
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      sentCookie = (init?.headers as Record<string, string> | undefined)?.["Cookie"] ?? null;
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const client = new FgvApiClient(fetchFn);

    await client.fetchPrevisiones(78);

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
    const client = new FgvApiClient(fetchFn);

    const result = await client.fetchPrevisiones(78);

    expect(bootstrapCalls).toBe(2);
    expect(previsionCalls).toBe(2);
    expect(result.previsiones.length).toBe(2);
  });

  it("should throw when the retried request also fails", async () => {
    const fetchFn = mock((url: string) => {
      if (url.includes("/estaciones")) return Promise.resolve(BOOTSTRAP_OK());
      return Promise.resolve(jsonResponse({}, { status: 500 }));
    });
    const client = new FgvApiClient(fetchFn);

    await expect(client.fetchPrevisiones(78)).rejects.toThrow(FgvApiError);
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
    const client = new FgvApiClient(fetchFn);

    await client.fetchPrevisiones(78);
    await client.fetchPrevisiones(78);

    expect(bootstrapCalls).toBe(1);
  });

  it("should abort and throw when FGV does not answer within the timeout", async () => {
    const hangingFetch = mock(
      (_url: string, init?: Parameters<typeof fetch>[1]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const client = new FgvApiClient(hangingFetch, undefined, 20);

    await expect(client.fetchPrevisiones(78)).rejects.toThrow();
  });

  describe("global deadline", () => {
    const delay = (ms: number, signal?: AbortSignal | null) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });

    it("should abort when the combined requests exceed the deadline", async () => {
      let previsionCalls = 0;
      const slowFetch = mock(async (url: string, init?: Parameters<typeof fetch>[1]) => {
        await delay(40, init?.signal);
        if (url.includes("/estaciones")) return BOOTSTRAP_OK();
        previsionCalls++;
        return previsionCalls === 1
          ? jsonResponse({}, { status: 404 })
          : jsonResponse(PREVISION_BODY);
      });
      const client = new FgvApiClient(slowFetch, undefined, 100);

      await expect(client.fetchPrevisiones(78)).rejects.toThrow();
    });

    it("should return the response when all requests finish within the deadline", async () => {
      const fastFetch = mock(async (url: string, init?: Parameters<typeof fetch>[1]) => {
        await delay(10, init?.signal);
        if (url.includes("/estaciones")) return BOOTSTRAP_OK();
        return jsonResponse(PREVISION_BODY);
      });
      const client = new FgvApiClient(fastFetch, undefined, 500);

      const result = await client.fetchPrevisiones(78);

      expect(result.previsiones.length).toBe(2);
    });
  });

  it("should fetch the station catalogue and prime the session from its cookies", async () => {
    let sentCookie: string | null = null;
    const fetchFn = mock((url: string, init?: Parameters<typeof fetch>[1]) => {
      if (url.includes("/estaciones")) {
        return Promise.resolve(jsonResponse([{ estacion_id_FGV: 1 }], BOOTSTRAP_COOKIES));
      }
      sentCookie = (init?.headers as Record<string, string> | undefined)?.["Cookie"] ?? null;
      return Promise.resolve(jsonResponse(PREVISION_BODY));
    });
    const client = new FgvApiClient(fetchFn);

    const stations = await client.fetchStations();
    await client.fetchPrevisiones(78);

    expect(stations.length).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sentCookie as string | null).toBe("fgv_api_session=abc123; XSRF-TOKEN=xyz789");
  });

  it("should throw when the station catalogue request fails", async () => {
    const fetchFn = mock(() => Promise.resolve(jsonResponse({}, { status: 500 })));
    const client = new FgvApiClient(fetchFn);

    await expect(client.fetchStations()).rejects.toThrow(FgvApiError);
  });
});
