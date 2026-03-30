import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearTables } from "tests/helpers/db";
import { UserRepositoryDrizzle } from "./UserRepositoryDrizzle";

describe("UserRepositoryDrizzle", () => {
  let container: Container;
  let repo: UserRepositoryDrizzle;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearTables(container.db, "users");
    repo = new UserRepositoryDrizzle(container.db);
  });

  afterAll(async () => {
    await clearTables(container.db, "users");
    await container.dispose();
  });

  describe("upsert", () => {
    it("should insert a new user", async () => {
      await repo.upsert({ chatId: 1001, firstName: "Ana", username: "ana", language: "es" });

      const languages = await repo.findAllLanguages();
      expect(languages.get(1001)).toBe("es");
    });

    it("should update an existing user on conflict", async () => {
      await repo.upsert({ chatId: 1001, firstName: "Ana", language: "es" });
      await repo.upsert({ chatId: 1001, firstName: "Ana", language: "en" });

      const languages = await repo.findAllLanguages();
      expect(languages.size).toBe(1);
      expect(languages.get(1001)).toBe("en");
    });

    it("should not overwrite language when language is omitted on update", async () => {
      await repo.upsert({ chatId: 1001, firstName: "Ana", language: "es" });
      await repo.upsert({ chatId: 1001, firstName: "Ana Updated" });

      const languages = await repo.findAllLanguages();
      expect(languages.get(1001)).toBe("es");
    });

    it("should handle upsert without optional fields", async () => {
      await repo.upsert({ chatId: 2001, firstName: "Bob" });
    });
  });

  describe("findAllLanguages", () => {
    it("should return a map of chatId -> language for users with a language set", async () => {
      await repo.upsert({ chatId: 1001, firstName: "Ana", language: "es" });
      await repo.upsert({ chatId: 1002, firstName: "Bob", language: "en" });

      const result = await repo.findAllLanguages();

      expect(result.size).toBe(2);
      expect(result.get(1001)).toBe("es");
      expect(result.get(1002)).toBe("en");
    });

    it("should exclude users with no language set", async () => {
      await repo.upsert({ chatId: 1001, firstName: "Ana", language: "es" });
      await repo.upsert({ chatId: 1002, firstName: "Bob" });

      const result = await repo.findAllLanguages();

      expect(result.size).toBe(1);
      expect(result.has(1002)).toBe(false);
    });

    it("should return empty map when no users exist", async () => {
      const result = await repo.findAllLanguages();

      expect(result.size).toBe(0);
    });

    it("should return empty map when no users have a language set", async () => {
      await repo.upsert({ chatId: 1001, firstName: "Ana" });
      await repo.upsert({ chatId: 1002, firstName: "Bob" });

      const result = await repo.findAllLanguages();

      expect(result.size).toBe(0);
    });
  });
});
