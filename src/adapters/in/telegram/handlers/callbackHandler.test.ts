import { describe, it, expect, mock } from "bun:test";
import { callbackHandler } from "./callbackHandler";
import type { SearchResult } from "@/core/application/query/SearchNextDepartures";

function makeStation(name: string) {
  return { name: { value: name }, id: { value: name.toLowerCase() } };
}

function makeDeparture(hours: number, minutes: number, lineName: string, minutesRemaining: number) {
  return {
    departureTime: { hours, minutes },
    lineName,
    minutesRemaining,
    headsign: null,
    lineColor: null,
    durationMinutes: null,
  };
}

function makeCtx(data: string | undefined) {
  return {
    chat: { id: 1 },
    callbackQuery: data !== undefined ? { data } : undefined,
    answerCallbackQuery: mock(() => Promise.resolve()),
    editMessageText: mock(() => Promise.resolve()),
  };
}

function makeDepartureResult(originName: string, destName: string): SearchResult {
  return {
    type: "departures",
    data: {
      origin: makeStation(originName),
      destination: makeStation(destName),
      departures: [makeDeparture(14, 23, "3", 4)],
      searchedAt: new Date(),
      firstTomorrow: null,
      routeLineName: null,
    },
  } as unknown as SearchResult;
}

function makeNoMoreTodayResult(originName: string, destName: string): SearchResult {
  return {
    type: "no_more_today",
    origin: makeStation(originName),
    destination: makeStation(destName),
    firstTomorrow: {
      departureTime: { hours: 5, minutes: 42 },
      lineName: "3",
      minutesRemaining: 0,
      headsign: null,
      lineColor: null,
      durationMinutes: null,
    },
    routeLineName: null,
  } as unknown as SearchResult;
}

function makeDisambiguationResult(): SearchResult {
  return {
    type: "disambiguation",
    field: "origin",
    candidates: [makeStation("Xàtiva"), makeStation("Xúquer")],
    otherName: "Colón",
  } as unknown as SearchResult;
}

describe("callbackHandler", () => {
  it("should call execute with originName=parts[2] and destinationName=parts[3] for field 'o'", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Xàtiva", "Colón"))),
    };

    const ctx = makeCtx("d|o|Xàtiva|Colón");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Xàtiva", "Colón", expect.any(Date));
  });

  it("should call execute with originName=parts[3] and destinationName=parts[2] for field 'd'", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Colón", "Xàtiva"))),
    };

    const ctx = makeCtx("d|d|Xàtiva|Colón");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Colón", "Xàtiva", expect.any(Date));
  });

  it("should edit message with formatted departures on happy path", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDepartureResult("Xàtiva", "Colón"))),
    };

    const ctx = makeCtx("d|o|Xàtiva|Colón");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith();
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0] as unknown as [
      string,
      { parse_mode: string },
    ];
    expect(text).toContain("Xàtiva");
    expect(text).toContain("Colón");
    expect(opts.parse_mode).toBe("HTML");
  });

  it("should edit message with no more today format when result is no_more_today", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeNoMoreTodayResult("Xàtiva", "Colón"))),
    };

    const ctx = makeCtx("d|o|Xàtiva|Colón");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith();
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0] as unknown as [
      string,
      { parse_mode: string },
    ];
    expect(text).toContain("No hay más salidas hoy");
    expect(opts.parse_mode).toBe("HTML");
  });

  it("should edit message with new disambiguation keyboard when result is still ambiguous", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeDisambiguationResult())),
    };

    const ctx = makeCtx("d|o|X|Colón");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith();
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0] as unknown as [
      string,
      { parse_mode: string; reply_markup: unknown },
    ];
    expect(text).toContain("Varias estaciones");
    expect(opts.parse_mode).toBe("HTML");
    expect(opts.reply_markup).toBeDefined();
  });

  it("should answerCallbackQuery with errInvalidData and not call execute when callback data is missing", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };

    const ctx = makeCtx("bad_data");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    const [opts] = ctx.answerCallbackQuery.mock.calls[0] as unknown as [{ text: string }];
    expect(opts.text).toBeDefined();
  });

  it("should return early without calling execute when callbackQuery data is undefined", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };

    const ctx = makeCtx(undefined);
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it("should answerCallbackQuery with errUnknown when use case throws", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new Error("unexpected failure"))),
    };

    const ctx = makeCtx("d|o|Xàtiva|Colón");
    const handler = callbackHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    const [opts] = ctx.answerCallbackQuery.mock.calls[0] as unknown as [{ text: string }];
    expect(opts.text).toContain("Error");
  });
});
