import { describe, it, expect, mock } from "bun:test";
import { departureHandler } from "./departureHandler";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";

function makeCtx(text: string) {
  return {
    message: { text },
    reply: mock(() => Promise.resolve()),
  };
}

function makeStation(name: string) {
  return { name: { value: name } };
}

function makeDeparture(hours: number, minutes: number, lineName: string, minutesRemaining: number) {
  return {
    departureTime: { hours, minutes },
    lineName,
    minutesRemaining,
  };
}

describe("departureHandler", () => {
  it("should reply with formatted departures on happy path", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve({
          origin: makeStation("Xàtiva"),
          destination: makeStation("Colón"),
          departures: [makeDeparture(14, 23, "L3", 4), makeDeparture(14, 31, "L5", 12)],
        }),
      ),
    };

    const ctx = makeCtx("/salida Xàtiva Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Xàtiva", "Colón", expect.any(Date));
    expect(ctx.reply).toHaveBeenCalledWith(
      "🚇 Xàtiva → Colón\n\nNext departures:\n1. 14:23 (in 4 min) — L3\n2. 14:31 (in 12 min) — L5\n\nℹ️ Planned schedules. Real times may vary.",
    );
  });

  it("should parse stations separated by ' - '", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve({
          origin: makeStation("Àngel Guimerà"),
          destination: makeStation("Colón"),
          departures: [],
        }),
      ),
    };

    const ctx = makeCtx("/salida Àngel Guimerà - Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledWith("Àngel Guimerà", "Colón", expect.any(Date));
  });

  it("should parse stations separated by ' a '", async () => {
    const mockUseCase = {
      execute: mock(() =>
        Promise.resolve({
          origin: makeStation("Àngel Guimerà"),
          destination: makeStation("Colón"),
          departures: [],
        }),
      ),
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
    expect(ctx.reply).toHaveBeenCalledWith("⚠️ Usage: /salida <origin> - <destination>");
  });

  it("should reply with usage hint when only one word provided", async () => {
    const mockUseCase = { execute: mock(() => Promise.resolve()) };
    const ctx = makeCtx("/salida Xàtiva");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("⚠️ Usage: /salida <origin> - <destination>");
  });

  it("should handle StationNotFoundError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new StationNotFoundError("Unknwon"))),
    };
    const ctx = makeCtx("/salida Unknwon Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Station not found: Unknwon");
  });

  it("should handle NoConnectionError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new NoConnectionError("Xàtiva", "Colón"))),
    };
    const ctx = makeCtx("/salida Xàtiva Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No connection found between Xàtiva and Colón");
  });

  it("should handle NoActiveServiceError", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.reject(new NoActiveServiceError(new Date()))),
    };
    const ctx = makeCtx("/salida Xàtiva Colón");
    const handler = departureHandler(mockUseCase as never);
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith("❌ No active service at this time");
  });
});
