import type { LiveDepartureProvider } from "@/core/domain/shared/LiveDepartureProvider";
import { LiveArrival } from "@/core/domain/shared/LiveArrival";
import { LineId } from "@/core/domain/line/LineId";
import type { StationId } from "@/core/domain/station/StationId";
import type { FgvStationIdRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/FgvStationIdRepositoryDrizzle";

/** Injectable fetch for tests. Derived from `typeof fetch`, not `RequestInit` directly — that
 *  type-only global trips this project's `no-undef` lint rule. */
export type FgvFetch = (
  url: string,
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

export const FGV_BASE_URL = "https://www.fgv.es/fgv/app/ca/api/v1/V";

// Honest identification, never impersonating the official app — see ./NOTES.md.
export const FGV_USER_AGENT =
  "ValenciaTransitBot/1.0 (+https://github.com/joelvp/valencia-transit)";

// A hung FGV request must not hang the bot: fail fast, the use case falls back to scheduled data.
export const FGV_DEFAULT_TIMEOUT_MS = 3000;

interface FgvTrain {
  destino: string | null;
  seconds: number;
  line_id?: number;
}

interface FgvPrevisionGroup {
  line: number;
  line_id: number;
  trains: FgvTrain[];
}

interface FgvPrevisionResponse {
  previsiones: FgvPrevisionGroup[];
}

/** LiveDepartureProvider backed by FGV's undocumented app API — see ./NOTES.md for endpoints,
 *  session handling, and the legal reasoning before changing retry behavior here. */
export class LiveDepartureProviderFgv implements LiveDepartureProvider {
  private cookieHeader: string | null = null;
  private sessionPrimed = false;

  constructor(
    private readonly fgvStationIdRepository: FgvStationIdRepositoryDrizzle,
    private readonly feedId: string,
    private readonly fetchFn: FgvFetch = fetch,
    private readonly baseUrl: string = FGV_BASE_URL,
    private readonly timeoutMs: number = FGV_DEFAULT_TIMEOUT_MS,
  ) {}

  async findLiveArrivals(stationId: StationId, now: Date): Promise<LiveArrival[]> {
    // `now` is part of the port signature (other providers may need it) but FGV's endpoint
    // already returns seconds-remaining directly, so this adapter has no use for it.
    void now;
    const fgvStationId = await this.fgvStationIdRepository.findFgvStationId(stationId, this.feedId);
    if (fgvStationId === null) return [];

    const data = await this.fetchPrevisionesWithRetry(fgvStationId);
    return this.toLiveArrivals(data);
  }

  /** Primes the session on first use, reuses the cookie afterwards, and resets + retries exactly
   *  once if the request comes back non-OK (treated as a possibly-expired session). */
  private async fetchPrevisionesWithRetry(fgvStationId: number): Promise<FgvPrevisionResponse> {
    if (!this.sessionPrimed) {
      await this.bootstrap();
    }

    let response = await this.fetchPrevisiones(fgvStationId);
    if (!response.ok) {
      await this.bootstrap();
      response = await this.fetchPrevisiones(fgvStationId);
    }

    if (!response.ok) {
      throw new Error(`FGV horarios-prevision-3 request failed with status ${response.status}`);
    }

    return (await response.json()) as FgvPrevisionResponse;
  }

  // Any public catalogue endpoint sets the session cookies — no need to call the app's own
  // version-check endpoint or claim a platform we aren't (see ./NOTES.md).
  private async bootstrap(): Promise<void> {
    const response = await this.fetchFn(`${this.baseUrl}/estaciones`, {
      headers: { Accept: "application/json", "User-Agent": FGV_USER_AGENT },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`FGV session bootstrap failed with status ${response.status}`);
    }

    const cookies = extractCookiePairs(response);
    this.cookieHeader = cookies.length > 0 ? cookies.join("; ") : null;
    this.sessionPrimed = true;
  }

  private async fetchPrevisiones(fgvStationId: number): Promise<Response> {
    return this.fetchFn(`${this.baseUrl}/horarios-prevision-3/${fgvStationId}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": FGV_USER_AGENT,
        ...(this.cookieHeader ? { Cookie: this.cookieHeader } : {}),
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  /** No FGV vocabulary (seconds, previsiones, vehicle) leaks past this point. */
  private toLiveArrivals(data: FgvPrevisionResponse): LiveArrival[] {
    const arrivals: LiveArrival[] = [];
    for (const group of data.previsiones ?? []) {
      for (const train of group.trains ?? []) {
        const lineNumber = train.line_id ?? group.line_id ?? group.line;
        if (lineNumber === undefined || lineNumber === null) continue;

        arrivals.push(
          new LiveArrival(
            new LineId(String(lineNumber)),
            train.destino ?? null,
            train.seconds / 60,
          ),
        );
      }
    }
    return arrivals;
  }
}

function extractCookiePairs(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const rawCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : (headers.get("set-cookie")?.split(/,(?=\s*[^;=\s]+=)/) ?? []);

  return rawCookies.map((raw) => raw.split(";")[0]!.trim()).filter((pair) => pair.length > 0);
}
