import { describe, it, expect, mock, beforeAll } from "bun:test";
import { lineHandler } from "./lineHandler";
import type { LineWithTerminals } from "@/core/application/query/ListLines";
import { initI18n } from "@/adapters/in/telegram/i18n";

const mockUserRepository = {
  upsert: mock(() => Promise.resolve()),
  findAllLanguages: mock(() => Promise.resolve(new Map())),
};
const mockEventBus = { publish: mock(() => Promise.resolve()) };

function makeLine(id: string): LineWithTerminals["line"] {
  return { id: { value: id } } as LineWithTerminals["line"];
}

function makeListLinesResult(): LineWithTerminals[] {
  return [
    { line: makeLine("3"), terminalFrom: "Rafelbunyol", terminalTo: "Aeroport" },
    { line: makeLine("1"), terminalFrom: "Bétera", terminalTo: "Villanueva de Castellón" },
  ];
}

function makeCtx() {
  return {
    chat: { id: 1 },
    reply: mock(() => Promise.resolve()),
  };
}

describe("lineHandler", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("should call listLines.execute and reply with inline keyboard", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeListLinesResult())),
    };

    const ctx = makeCtx();
    const handler = lineHandler(mockUseCase as never, mockUserRepository, mockEventBus);
    await handler(ctx as never);

    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledTimes(1);

    const [text, opts] = ctx.reply.mock.calls[0] as unknown as [
      string,
      { reply_markup: { inline_keyboard: { text: string; callback_data: string }[][] } },
    ];

    expect(text).toBeDefined();
    expect(opts.reply_markup.inline_keyboard).toHaveLength(2);
  });

  it("should use li|{lineId} as callback_data for each button", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeListLinesResult())),
    };

    const ctx = makeCtx();
    const handler = lineHandler(mockUseCase as never, mockUserRepository, mockEventBus);
    await handler(ctx as never);

    const [, opts] = ctx.reply.mock.calls[0] as unknown as [
      string,
      { reply_markup: { inline_keyboard: { text: string; callback_data: string }[][] } },
    ];

    const buttons = opts.reply_markup.inline_keyboard.map((row) => row[0]!);
    expect(buttons[0]!.callback_data).toBe("li|3");
    expect(buttons[1]!.callback_data).toBe("li|1");
  });

  it("should include terminal names in button text", async () => {
    const mockUseCase = {
      execute: mock(() => Promise.resolve(makeListLinesResult())),
    };

    const ctx = makeCtx();
    const handler = lineHandler(mockUseCase as never, mockUserRepository, mockEventBus);
    await handler(ctx as never);

    const [, opts] = ctx.reply.mock.calls[0] as unknown as [
      string,
      { reply_markup: { inline_keyboard: { text: string; callback_data: string }[][] } },
    ];

    const buttons = opts.reply_markup.inline_keyboard.map((row) => row[0]!);
    expect(buttons[0]!.text).toContain("Rafelbunyol");
    expect(buttons[0]!.text).toContain("Aeroport");
    expect(buttons[0]!.text).toContain("L3");
  });
});
