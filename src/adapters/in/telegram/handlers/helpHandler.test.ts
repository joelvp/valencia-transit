import { describe, it, expect, mock } from "bun:test";
import { helpHandler } from "./helpHandler";

function makeCtx() {
  return {
    message: { text: "/help" },
    reply: mock(() => Promise.resolve()),
  };
}

describe("helpHandler", () => {
  it("should reply with help text listing all commands", async () => {
    const ctx = makeCtx();
    const handler = helpHandler();
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const response = (ctx.reply.mock.calls[0] as unknown as [string])[0];
    expect(response).toContain("/salida <origin> - <destination>");
    expect(response).toContain("/s <origin> - <destination>");
    expect(response).toContain("/paradas");
    expect(response).toContain("/help");
  });

  it("should work when called for /start command", async () => {
    const ctx = { message: { text: "/start" }, reply: mock(() => Promise.resolve()) };
    const handler = helpHandler();
    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
  });
});
