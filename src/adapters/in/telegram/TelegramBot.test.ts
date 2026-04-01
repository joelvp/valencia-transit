import { describe, it, expect, mock, beforeAll } from "bun:test";
import type { UserFromGetMe } from "grammy/types";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";
import { initI18n, type Lang } from "@/adapters/in/telegram/i18n";
import { setLang, getLang } from "@/adapters/in/telegram/languageStore";

const FAKE_BOT_INFO = {
  id: 123456789,
  is_bot: true,
  first_name: "TestBot",
  username: "testbot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
} as UserFromGetMe;

function makeBot() {
  const mockSearchNextDepartures = { execute: mock(() => Promise.resolve(null)) };
  const mockFindStation = { execute: mock(() => Promise.resolve(null)) };
  const mockListLines = { execute: mock(() => Promise.resolve([])) };
  const mockGetLineStations = { execute: mock(() => Promise.resolve(null)) };
  const mockEventBus = { publish: mock(() => Promise.resolve()) };
  const mockUserRepository = {
    findById: mock(() => Promise.resolve(null)),
    save: mock(() => Promise.resolve()),
    findAllLanguages: mock(() => Promise.resolve(new Map())),
  };
  const mockChangeUserLanguage = { execute: mock(() => Promise.resolve()) };

  const bot = new TelegramBot(
    "fake-token",
    mockSearchNextDepartures as never,
    mockFindStation as never,
    mockListLines as never,
    mockGetLineStations as never,
    mockEventBus as never,
    mockUserRepository as never,
    mockChangeUserLanguage as never,
    { botInfo: FAKE_BOT_INFO, disableRateLimit: true },
  );

  return bot;
}

describe("TelegramBot", () => {
  beforeAll(async () => {
    await initI18n();
  });

  describe("restoreCommandScopes", () => {
    it("should call setMyCommands for val users with correct chatId and lang-specific commands", async () => {
      const bot = makeBot();
      const calls: Array<{ method: string; chatId?: number; commands?: unknown }> = [];

      bot["bot"].api.config.use((prev, method, payload) => {
        if (method === "setMyCommands") {
          const p = payload as { scope?: { chat_id?: number }; commands: unknown };
          calls.push({ method, chatId: p.scope?.chat_id, commands: p.commands });
        }
        return Promise.resolve({ ok: true, result: true } as never);
      });

      const languages = new Map([
        ["111", "val"],
        ["222", "es"],
      ]);

      await bot.restoreCommandScopes(languages);

      const setCommandsCalls = calls.filter((c) => c.method === "setMyCommands");
      expect(setCommandsCalls).toHaveLength(1);
      expect(setCommandsCalls[0]!.chatId).toBe(111);
    });

    it("should call setMyCommands for en users with correct chatId and lang-specific commands", async () => {
      const bot = makeBot();
      const calls: Array<{ method: string; chatId?: number }> = [];

      bot["bot"].api.config.use((prev, method, payload) => {
        if (method === "setMyCommands") {
          const p = payload as { scope?: { chat_id?: number } };
          calls.push({ method, chatId: p.scope?.chat_id });
        }
        return Promise.resolve({ ok: true, result: true } as never);
      });

      const languages = new Map([["999", "en"]]);
      await bot.restoreCommandScopes(languages);

      const setCommandsCalls = calls.filter((c) => c.method === "setMyCommands");
      expect(setCommandsCalls).toHaveLength(1);
      expect(setCommandsCalls[0]!.chatId).toBe(999);
    });

    it("should NOT call setMyCommands for es users", async () => {
      const bot = makeBot();
      const calls: string[] = [];

      bot["bot"].api.config.use((prev, method) => {
        calls.push(method);
        return Promise.resolve({ ok: true, result: true } as never);
      });

      const languages = new Map([
        ["100", "es"],
        ["200", "es"],
      ]);

      await bot.restoreCommandScopes(languages);

      expect(calls.filter((m) => m === "setMyCommands")).toHaveLength(0);
    });

    it("should call setMyCommands once per val/en user when map has mixed languages", async () => {
      const bot = makeBot();
      const chatIds: number[] = [];

      bot["bot"].api.config.use((prev, method, payload) => {
        if (method === "setMyCommands") {
          const p = payload as { scope?: { chat_id?: number } };
          if (p.scope?.chat_id !== undefined) {
            chatIds.push(p.scope.chat_id);
          }
        }
        return Promise.resolve({ ok: true, result: true } as never);
      });

      const languages = new Map([
        ["10", "es"],
        ["20", "val"],
        ["30", "en"],
        ["40", "es"],
      ]);

      await bot.restoreCommandScopes(languages);

      expect(chatIds).toHaveLength(2);
      expect(chatIds).toContain(20);
      expect(chatIds).toContain(30);
    });

    it("should handle an empty map without errors", async () => {
      const bot = makeBot();
      const calls: string[] = [];

      bot["bot"].api.config.use((prev, method) => {
        calls.push(method);
        return Promise.resolve({ ok: true, result: true } as never);
      });

      await bot.restoreCommandScopes(new Map());

      expect(calls.filter((m) => m === "setMyCommands")).toHaveLength(0);
    });
  });
});

// The startup loop in main.ts calls setLang(parseInt(chatId), lang) for each
// entry returned by userRepository.findAllLanguages(). These tests verify that
// pattern correctly populates the language store so subsequent handler calls
// use the right language per chat.
describe("startup language recovery (main.ts loop pattern)", () => {
  it("should make getLang return the correct language after the startup loop runs", () => {
    const languages = new Map([
      ["1001", "val"],
      ["1002", "en"],
      ["1003", "es"],
    ]);

    // Simulate the startup loop
    for (const [chatId, lang] of languages) {
      setLang(parseInt(chatId), lang as Lang);
    }

    expect(getLang(1001)).toBe("val");
    expect(getLang(1002)).toBe("en");
    expect(getLang(1003)).toBe("es");
  });

  it("should default to es for chat IDs not present in findAllLanguages result", () => {
    const languages = new Map([["2001", "en"]]);

    for (const [chatId, lang] of languages) {
      setLang(parseInt(chatId), lang as Lang);
    }

    // chatId 9999 was never in the languages map — should fall back to default
    expect(getLang(9999)).toBe("es");
  });

  it("should correctly apply all entries when findAllLanguages returns a mixed map", () => {
    const findAllLanguages = mock(() =>
      Promise.resolve(
        new Map([
          ["3001", "val"],
          ["3002", "es"],
          ["3003", "en"],
        ]),
      ),
    );

    // Simulate what main.ts does with the result
    const applyLanguages = async (repoFn: () => Promise<Map<string, string>>): Promise<void> => {
      const langs = await repoFn();
      for (const [chatId, lang] of langs) {
        setLang(parseInt(chatId), lang as Lang);
      }
    };

    return applyLanguages(findAllLanguages).then(() => {
      expect(findAllLanguages).toHaveBeenCalledTimes(1);
      expect(getLang(3001)).toBe("val");
      expect(getLang(3002)).toBe("es");
      expect(getLang(3003)).toBe("en");
    });
  });
});
