import { describe, it, expect } from "bun:test";
import { User } from "./User";
import { UserId } from "./UserId";

const validUuid1 = "550e8400-e29b-41d4-a716-446655440000";
const validUuid2 = "6ba7b810-9dad-41d4-80b4-00c04fd430c8";

function makeUser(uuid = validUuid1, language?: string): User {
  return new User(new UserId(uuid), language, new Date(), new Date());
}

describe("User", () => {
  it("should create a user with required fields", () => {
    const user = makeUser();
    expect(user.userId.value).toBe(validUuid1);
    expect(user.language).toBeUndefined();
  });

  it("should create a user with language", () => {
    const user = makeUser(validUuid1, "es");
    expect(user.language).toBe("es");
  });

  it("should be equal to another user with the same userId", () => {
    expect(makeUser(validUuid1).equals(makeUser(validUuid1, "en"))).toBe(true);
  });

  it("should not be equal to a user with a different userId", () => {
    expect(makeUser(validUuid1).equals(makeUser(validUuid2))).toBe(false);
  });
});
