import { describe, it, expect, mock } from "bun:test";
import { stationHandler } from "./stationHandler";

function makeStation(name: string) {
  return { name: { value: name } };
}

function makeCtx() {
  return {
    message: { text: "/paradas" },
    reply: mock(() => Promise.resolve()),
  };
}

describe("stationHandler", () => {
  it("should reply with formatted station list", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve([
          makeStation("Xàtiva"),
          makeStation("Colón"),
          makeStation("Àngel Guimerà"),
        ]),
      ),
    };

    const ctx = makeCtx();
    const handler = stationHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      "🚉 Available stations:\n\nXàtiva\nColón\nÀngel Guimerà",
    );
  });

  it("should reply with a message when no stations available", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve([])),
    };

    const ctx = makeCtx();
    const handler = stationHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("ℹ️ No stations available.");
  });
});
