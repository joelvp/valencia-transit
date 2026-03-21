import { describe, it, expect, mock } from "bun:test";
import { stationHandler } from "./stationHandler";

function makeStation(name: string) {
  return { name: { value: name }, id: { value: name.toLowerCase() } };
}

function makeLine(name: string, color: string | null = null) {
  return {
    id: {
      value: name.toLowerCase(),
      equals: (o: { value: string }) => o.value === name.toLowerCase(),
    },
    name: { value: name },
    color: color ? { value: color } : null,
    stops: [],
  };
}

function makeStationWithLines(stationName: string, lines: ReturnType<typeof makeLine>[] = []) {
  return { station: makeStation(stationName), lines };
}

function makeCtx() {
  return {
    message: { text: "/paradas" },
    reply: mock(() => Promise.resolve()),
  };
}

describe("stationHandler", () => {
  it("should reply with formatted station list with lines", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve([
          makeStationWithLines("Xàtiva", [makeLine("3", "DD052C")]),
          makeStationWithLines("Colón", [makeLine("3", "DD052C"), makeLine("5", "008F71")]),
          makeStationWithLines("Àngel Guimerà"),
        ]),
      ),
    };

    const ctx = makeCtx();
    const handler = stationHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalled();
    const response = (ctx.reply.mock.calls[0] as string[])[0];
    expect(response).toContain("Xàtiva  🔴 L3");
    expect(response).toContain("Colón  🔴 L3 · 🟢 L5");
    expect(response).toContain("Àngel Guimerà");
  });

  it("should reply with a message when no stations available", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve([])),
    };

    const ctx = makeCtx();
    const handler = stationHandler(mockUseCase as never);
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as unknown[])[0] as string;
    expect(response).toContain("No hay estaciones disponibles");
  });

  it("should show white circle for unknown colors", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve([makeStationWithLines("Test", [makeLine("99")])])),
    };

    const ctx = makeCtx();
    const handler = stationHandler(mockUseCase as never);
    await handler(ctx as never);

    const response = (ctx.reply.mock.calls[0] as string[])[0];
    expect(response).toContain("⚪ L99");
  });
});
