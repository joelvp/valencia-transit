import { describe, it, expect, mock } from "bun:test";
import { departureHandler } from "./departureHandler";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import type { SearchResult } from "@/core/application/query/SearchNextDepartures";

function makeCtx(text: string) {
  return {
    message: { text },
    reply: mock(() => Promise.resolve()),
  };
}

function makeStation(name: string) {
  return { name: { value: name }, id: { value: name.toLowerCase() } };
}

function makeDeparture(
  hours: number,
  minutes: number,
  lineName: string,
  minutesRemaining: number,
  headsign: string | null = null,
) {
  return { departureTime: { hours, minutes }, lineName, minutesRemaining, headsign };
}

function makeDepartureResult(
  originName: string,
  destName: string,
  departures: ReturnType<typeof makeDeparture>[] = [],
): SearchResult {
  return {
    type: "departures",
    data: {
      origin: makeStation(originName),
      destination: makeStation(destName),
      departures,
      searchedAt: new Date(),
    },
  } as unknown as SearchResult;
}

describe("departureHandler", () => {
  it("should reply with formatted departures on happy path", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve(
          makeDepartureResult("Xàtiva", "Colón", [
            makeDeparture(14, 23, "L3", 4),
            makeDeparture(14, 31, "L5", 12),
          ]),
        ),
      ),
    };

    const ctx = makeCtx("/salida Xàtiva Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Xàtiva", "Colón", expect.any(Date));
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("<b>Xàtiva → Colón</b>");
    expect(response).toContain("<b>14:23</b>");
    expect(response).toContain("<b>L3</b>");
  });

  it("should parse stations separated by ' - '", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Àngel Guimerà", "Colón"))),
    };

    const ctx = makeCtx("/salida Àngel Guimerà - Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Àngel Guimerà", "Colón", expect.any(Date));
  });

  it("should parse stations separated by ' a '", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Àngel Guimerà", "Colón"))),
    };

    const ctx = makeCtx("/salida Àngel Guimerà a Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Àngel Guimerà", "Colón", expect.any(Date));
  });

  it("should reply with usage hint when no arguments provided", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const ctx = makeCtx("/salida");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("Uso:");
  });

  it("should reply with usage hint when only one word provided", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const ctx = makeCtx("/salida Xàtiva");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("Uso:");
  });

  it("should handle StationNotFoundError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new StationNotFoundError("Unknwon"))),
    };
    const ctx = makeCtx("/salida Unknwon Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Estación no encontrada: Unknwon");
  });

  it("should handle NoConnectionError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new NoConnectionError("Xàtiva", "Colón"))),
    };
    const ctx = makeCtx("/salida Xàtiva Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No hay conexión entre Xàtiva y Colón");
  });

  it("should handle NoActiveServiceError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new NoActiveServiceError(new Date()))),
    };
    const ctx = makeCtx("/salida Xàtiva Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No hay servicio activo en este momento");
  });

  it("should show disambiguation keyboard when multiple matches", async () => {
    const disambigResult: SearchResult = {
      type: "disambiguation",
      field: "origin",
      candidates: [makeStation("Xàtiva"), makeStation("Xúquer")],
      otherName: "Colón",
    } as unknown as SearchResult;

    const mockUseCase = {
      execute: mock(() => Promise.resolve(disambigResult)),
    };

    const ctx = makeCtx("/salida X Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    const callArgs = ctx.reply.mock.calls[0] as unknown[];
    const response = callArgs[0] as string;
    const opts = callArgs[1] as { parse_mode: string; reply_markup: unknown };
    expect(response).toContain("Varias estaciones encontradas");
    expect(opts.parse_mode).toBe("HTML");
    expect(opts.reply_markup).toBeDefined();
  });
});
