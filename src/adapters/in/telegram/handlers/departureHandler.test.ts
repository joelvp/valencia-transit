import { describe, it, expect, mock, beforeEach, beforeAll } from "bun:test";
import { departureHandler } from "./departureHandler";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { StationsNotConnectedError } from "@/core/domain/error/StationsNotConnectedError";
import { NoServiceError } from "@/core/domain/error/NoServiceError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import type { SearchResult } from "@/core/application/query/SearchNextDepartures";
import type { FindStationResult } from "@/core/application/query/FindStation";
import {
  getConversationState,
  setConversationState,
  clearConversationState,
} from "@/adapters/in/telegram/conversationStore";
import { initI18n } from "@/adapters/in/telegram/i18n";

const mockUserRepository = {
  upsert: mock(() => Promise.resolve()),
  findAllLanguages: mock(() => Promise.resolve(new Map())),
};

const notFoundResult: FindStationResult = { type: "not_found" };

function makeUnique(name: string): FindStationResult {
  return { type: "unique", stationName: name };
}

function makeDisambig(names: string[]): FindStationResult {
  return { type: "disambiguation", candidates: names.map((name) => ({ name })) };
}

let chatIdCounter = 1000;

function makeCtx(text: string, chatId?: number) {
  const id = chatId ?? chatIdCounter++;
  return {
    chat: { id },
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
  lineColor: string | null = null,
  durationMinutes: number | null = null,
) {
  return {
    departureTime: { hours, minutes },
    lineName,
    minutesRemaining,
    headsign,
    lineColor,
    durationMinutes,
  };
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
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(() => {
    // Reset conversation state for a fresh chatId range each test
    for (let i = 1000; i < 2000; i++) {
      clearConversationState(i);
    }
  });

  it("should reply with formatted departures on happy path", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve(
          makeDepartureResult("Xàtiva", "Colón", [
            makeDeparture(14, 23, "3", 4, null, "DD052C", 8),
            makeDeparture(14, 31, "5", 12, null, "008F71", 8),
          ]),
        ),
      ),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      "Xàtiva",
      "Colón",
      expect.any(Date),
      expect.any(String),
    );
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("🚇 <b>Xàtiva → Colón</b>");
    expect(response).toContain("(~8 min)");
    expect(response).toContain("<b>14:23</b>");
    expect(response).toContain("<b>L3</b>");
    expect(response).toContain("🔴");
    expect(response).toContain("(4 min)");
  });

  it("should show color emoji based on lineColor hex", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve(
          makeDepartureResult("Xàtiva", "Colón", [
            makeDeparture(17, 23, "4", 5, null, "014A99", null),
          ]),
        ),
      ),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("🔵");
    expect(response).toContain("<b>17:23</b>");
    expect(response).toContain("<b>L4</b>");
    expect(response).toContain("(5 min)");
  });

  it("should show white circle emoji when line number is unknown", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve(
          makeDepartureResult("Xàtiva", "Colón", [makeDeparture(10, 0, "99", 2, null, null, null)]),
        ),
      ),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("⚪");
  });

  it("should not include duration suffix when durationMinutes is null", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve(
          makeDepartureResult("Xàtiva", "Colón", [
            makeDeparture(14, 23, "3", 4, null, "DD052C", null),
          ]),
        ),
      ),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("🚇 <b>Xàtiva → Colón</b>");
    expect(response).not.toContain("~");
  });

  it("should include origin and destination in header", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve(makeDepartureResult("Xàtiva", "Colón", [makeDeparture(14, 23, "3", 4)])),
      ),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("🚇 <b>Xàtiva → Colón</b>");
  });

  it("should parse stations separated by ' - '", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Àngel Guimerà", "Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Àngel Guimerà - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      "Àngel Guimerà",
      "Colón",
      expect.any(Date),
      expect.any(String),
    );
  });

  it("should parse stations separated by ' a '", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Àngel Guimerà", "Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Àngel Guimerà a Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      "Àngel Guimerà",
      "Colón",
      expect.any(Date),
      expect.any(String),
    );
  });

  it("should start conversational flow when /salida called with no args", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("Desde dónde");
    expect(response).toContain("cancelar");
  });

  it("should reply with usage hint when only one word provided (command with single arg)", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("Valencia Transit Bot");
  });

  it("should reply stationNotFoundInFlow and stay in awaiting_origin when station not found", async () => {
    const chatId = 1500;
    setConversationState(chatId, { step: "awaiting_origin" });

    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("Desconocida", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("No conozco ninguna estación");
    expect(response).toContain("cancelar");
    // State should still be awaiting_origin
    expect(getConversationState(chatId)?.step).toBe("awaiting_origin");
  });

  it("should reply with disambiguation keyboard in awaiting_origin when multiple stations found", async () => {
    const chatId = 1501;
    setConversationState(chatId, { step: "awaiting_origin" });

    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = {
      execute: mock(() => Promise.resolve(makeDisambig(["Xàtiva", "Xúquer"]))),
    };

    const ctx = makeCtx("X", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const callArgs = ctx.reply.mock.calls[0] as unknown[];
    const response = callArgs[0] as string;
    const opts = callArgs[1] as { reply_markup: unknown };
    expect(response).toContain("Cuál querías decir");
    expect(opts.reply_markup).toBeDefined();
    // State should still be awaiting_origin
    expect(getConversationState(chatId)?.step).toBe("awaiting_origin");
  });

  it("should set awaiting_destination and reply askDestination when unique station found in awaiting_origin", async () => {
    const chatId = 1502;
    setConversationState(chatId, { step: "awaiting_origin" });

    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = { execute: mock(() => Promise.resolve(makeUnique("Xàtiva"))) };

    const ctx = makeCtx("Xàtiva", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("Hasta dónde");
    const state = getConversationState(chatId);
    expect(state?.step).toBe("awaiting_destination");
    if (state?.step === "awaiting_destination") {
      expect(state.originName).toBe("Xàtiva");
    }
  });

  it("should ask for destination when text received in awaiting_origin state (legacy check)", async () => {
    const chatId = 1503;
    setConversationState(chatId, { step: "awaiting_origin" });

    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = { execute: mock(() => Promise.resolve(makeUnique("Xàtiva"))) };

    const ctx = makeCtx("Xàtiva", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("Hasta dónde");
  });

  it("should execute search when unique station received in awaiting_destination state", async () => {
    const chatId = 1504;
    setConversationState(chatId, { step: "awaiting_destination", originName: "Xàtiva" });

    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Xàtiva", "Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(makeUnique("Colón"))) };

    const ctx = makeCtx("Colón", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      "Xàtiva",
      "Colón",
      expect.any(Date),
      expect.any(String),
    );
  });

  it("should reply stationNotFoundInFlow and stay in awaiting_destination when station not found", async () => {
    const chatId = 1505;
    setConversationState(chatId, { step: "awaiting_destination", originName: "Xàtiva" });

    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("Desconocida", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("No conozco ninguna estación");
    expect(getConversationState(chatId)?.step).toBe("awaiting_destination");
  });

  it("should clear conversation state after search from awaiting_destination", async () => {
    const chatId = 1506;
    setConversationState(chatId, { step: "awaiting_destination", originName: "Xàtiva" });

    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Xàtiva", "Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(makeUnique("Colón"))) };

    const ctx = makeCtx("Colón", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    // State should be cleared — a second single-word free-text message shows help, not a search
    const ctx2 = makeCtx("something", chatId);
    await handler(ctx2 as never);
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("should clear conversation state even when search throws an error", async () => {
    const chatId = 1507;
    setConversationState(chatId, { step: "awaiting_destination", originName: "Xàtiva" });

    const mockUseCase = {
      execute: mock(() => Promise.reject(new StationNotFoundError("Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(makeUnique("Colón"))) };

    const ctx = makeCtx("Colón", chatId);
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    // State cleared — second single-word free-text shows help, not another search
    const ctx2 = makeCtx("something", chatId);
    await handler(ctx2 as never);
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("should handle StationNotFoundError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new StationNotFoundError("Unknwon"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Unknwon - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Estación no encontrada: Unknwon");
  });

  it("should handle StationsNotConnectedError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new StationsNotConnectedError("Xàtiva", "Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No hay conexión entre Xàtiva y Colón");
  });

  it("should handle NoServiceError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new NoServiceError("Xàtiva", "Colón"))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No hay servicio activo en este momento");
  });

  it("should handle NoActiveServiceError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new NoActiveServiceError(new Date()))),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No hay servicio activo en este momento");
  });

  it("should show disambiguation keyboard when multiple matches (command path)", async () => {
    const disambigResult: SearchResult = {
      type: "disambiguation",
      field: "origin",
      candidates: [makeStation("Xàtiva"), makeStation("Xúquer")],
      otherName: "Colón",
    } as unknown as SearchResult;

    const mockUseCase = {
      execute: mock(() => Promise.resolve(disambigResult)),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida X - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const callArgs = ctx.reply.mock.calls[0] as unknown[];
    const response = callArgs[0] as string;
    const opts = callArgs[1] as { parse_mode: string; reply_markup: unknown };
    expect(response).toContain("Varias estaciones encontradas");
    expect(opts.parse_mode).toBe("HTML");
    expect(opts.reply_markup).toBeDefined();
  });

  it("should show no more trains today message with destination-only header", async () => {
    const noMoreResult: SearchResult = {
      type: "no_more_today",
      origin: makeStation("Xàtiva"),
      destination: makeStation("Colón"),
      firstTomorrow: {
        departureTime: { hours: 5, minutes: 42 },
        lineName: "3",
        headsign: "Colón",
        minutesRemaining: 0,
        lineColor: "DD052C",
        durationMinutes: null,
      },
    } as unknown as SearchResult;

    const mockUseCase = {
      execute: mock(() => Promise.resolve(noMoreResult)),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const callArgs = ctx.reply.mock.calls[0] as unknown[];
    const response = callArgs[0] as string;
    expect(response).toContain("🚇 <b>Xàtiva → Colón</b>");
    expect(response).toContain("No hay más salidas hoy");
    expect(response).toContain("05:42");
    expect(response).toContain("Primera salida mañana");
  });

  it("should show no more trains message without tomorrow when no service", async () => {
    const noMoreResult: SearchResult = {
      type: "no_more_today",
      origin: makeStation("Xàtiva"),
      destination: makeStation("Colón"),
      firstTomorrow: null,
    } as unknown as SearchResult;

    const mockUseCase = {
      execute: mock(() => Promise.resolve(noMoreResult)),
    };
    const mockFindStation = { execute: mock(() => Promise.resolve(notFoundResult)) };

    const ctx = makeCtx("/salida Xàtiva - Colón");
    const handler = departureHandler(
      mockUseCase as never,
      mockUserRepository,
      mockFindStation as never,
    );
    await handler(ctx as never);

    const callArgs = ctx.reply.mock.calls[0] as unknown[];
    const response = callArgs[0] as string;
    expect(response).toContain("No hay más salidas hoy");
    expect(response).not.toContain("Primera salida mañana");
  });
});
