import { describe, it, expect } from "bun:test";
import { User } from "./User";
import { ChatId } from "./ChatId";

function makeUser(chatId = 100n, firstName = "Ana"): User {
  return new User(new ChatId(chatId), firstName);
}

describe("User", () => {
  it("should create a user with required fields", () => {
    const user = makeUser();
    expect(user.chatId.value).toBe(100n);
    expect(user.firstName).toBe("Ana");
    expect(user.username).toBeUndefined();
    expect(user.lastName).toBeUndefined();
  });

  it("should create a user with all optional fields", () => {
    const user = new User(new ChatId(200n), "Carlos", "carlos_v", "García");
    expect(user.username).toBe("carlos_v");
    expect(user.lastName).toBe("García");
  });

  it("should be equal to another user with the same chatId", () => {
    expect(makeUser(50n, "Ana").equals(makeUser(50n, "Otro"))).toBe(true);
  });

  it("should not be equal to a user with a different chatId", () => {
    expect(makeUser(50n).equals(makeUser(51n))).toBe(false);
  });
});
