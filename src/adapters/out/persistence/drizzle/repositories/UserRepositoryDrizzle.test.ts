import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearTables } from "tests/helpers/db";
import { UserRepositoryDrizzle } from "./UserRepositoryDrizzle";
import { UserId } from "@/core/domain/user/UserId";

const userId1 = new UserId("550e8400-e29b-41d4-a716-446655440000");

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

  describe("findAllLanguages", () => {
    it("should return empty map when no users exist", async () => {
      const result = await repo.findAllLanguages();
      expect(result.size).toBe(0);
    });
  });

  describe("findLanguageByUserId", () => {
    it("should return null when user does not exist", async () => {
      const result = await repo.findLanguageByUserId(userId1);
      expect(result).toBeNull();
    });
  });
});
