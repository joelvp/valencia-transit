import { FgvApiError } from "./FgvApiError";

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

export interface FgvStation {
  estacion_id_FGV: number;
  nombre: string;
  latitud: number;
  longitud: number;
}

export interface FgvTrain {
  destino: string | null;
  seconds: number;
  line_id?: number;
}

export interface FgvPrevisionGroup {
  line: number;
  line_id: number;
  trains: FgvTrain[];
}

export interface FgvPrevisionResponse {
  previsiones: FgvPrevisionGroup[];
}

/** HTTP client for FGV's undocumented app API — see ./NOTES.md for endpoints and session handling. */
export class FgvApiClient {
  private cookieHeader: string | null = null;
  private sessionPrimed = false;

  constructor(
    private readonly fetchFn: FgvFetch = fetch,
    private readonly baseUrl: string = FGV_BASE_URL,
    private readonly timeoutMs: number = FGV_DEFAULT_TIMEOUT_MS,
  ) {}

  /** Full station catalogue. Its response also primes the session cookies. */
  async fetchStations(): Promise<FgvStation[]> {
    const response = await this.requestStations(AbortSignal.timeout(this.timeoutMs));
    this.storeSession(response);
    return (await response.json()) as FgvStation[];
  }

  /** Primes the session on first use, reuses the cookie afterwards, and resets + retries exactly
   *  once if the request comes back non-OK (treated as a possibly-expired session).
   *  One deadline covers every request of the call, so the worst-case wait is `timeoutMs`. */
  async fetchPrevisiones(fgvStationId: number): Promise<FgvPrevisionResponse> {
    const deadline = AbortSignal.timeout(this.timeoutMs);
    if (!this.sessionPrimed) {
      await this.bootstrap(deadline);
    }

    let response = await this.requestPrevisiones(fgvStationId, deadline);
    if (!response.ok) {
      await this.bootstrap(deadline);
      response = await this.requestPrevisiones(fgvStationId, deadline);
    }

    if (!response.ok) {
      throw new FgvApiError("horarios-prevision-3", response.status);
    }

    return (await response.json()) as FgvPrevisionResponse;
  }

  // Any public catalogue endpoint sets the session cookies — no need to call the app's own
  // version-check endpoint or claim a platform we aren't (see ./NOTES.md).
  private async bootstrap(signal: AbortSignal): Promise<void> {
    const response = await this.requestStations(signal);
    this.storeSession(response);
  }

  private async requestStations(signal: AbortSignal): Promise<Response> {
    const response = await this.fetchFn(`${this.baseUrl}/estaciones`, {
      headers: { Accept: "application/json", "User-Agent": FGV_USER_AGENT },
      signal,
    });
    if (!response.ok) {
      throw new FgvApiError("/estaciones", response.status);
    }
    return response;
  }

  private storeSession(response: Response): void {
    const cookies = extractCookiePairs(response);
    this.cookieHeader = cookies.length > 0 ? cookies.join("; ") : null;
    this.sessionPrimed = true;
  }

  private requestPrevisiones(fgvStationId: number, signal: AbortSignal): Promise<Response> {
    return this.fetchFn(`${this.baseUrl}/horarios-prevision-3/${fgvStationId}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": FGV_USER_AGENT,
        ...(this.cookieHeader ? { Cookie: this.cookieHeader } : {}),
      },
      signal,
    });
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
