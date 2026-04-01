import { describe, it, expect, mock } from "bun:test";
import { createUserMiddleware } from "./userMiddleware";
import type { UserRepository } from "@/core/domain/user/UserRepository";

const validUserId = "550e8400-e29b-41d4-a716-446655440000";

function makeUserRepository(returnedUserId = validUserId): UserRepository {
  return {
    updateLanguage: mock(() => Promise.resolve()),
    findLanguageByUserId: mock(() => Promise.resolve(null)),
    findAllLanguages: mock(() => Promise.resolve(new Map())),
    upsertByProvider: mock(() => Promise.resolve(returnedUserId)),
  };
}

function makeCtx(overrides: {
  chatId?: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}) {
  return {
    chat: overrides.chatId !== undefined ? { id: overrides.chatId } : undefined,
    from: overrides.from,
    requestId: "",
    userId: "",
  };
}

describe("createUserMiddleware", () => {
  it("should generate a requestId UUID on every update", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({ chatId: 123, from: { id: 123, is_bot: false, first_name: "Test" } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    expect(ctx.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should call upsertByProvider with telegram provider and chatId string", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({ chatId: 456, from: { id: 456, is_bot: false, first_name: "Ana" } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    expect(repo.upsertByProvider).toHaveBeenCalledTimes(1);
    expect(repo.upsertByProvider).toHaveBeenCalledWith("telegram", "456", expect.any(Object));
  });

  it("should attach userId from upsertByProvider result to context", async () => {
    const repo = makeUserRepository(validUserId);
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({ chatId: 789, from: { id: 789, is_bot: false } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    expect(ctx.userId).toBe(validUserId);
  });

  it("should include firstName in metadata when from.first_name is set", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({
      chatId: 100,
      from: { id: 100, is_bot: false, first_name: "María" },
    });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    const metadata = (repo.upsertByProvider as ReturnType<typeof mock>).mock.calls[0]![2] as Record<
      string,
      unknown
    >;
    expect(metadata["firstName"]).toBe("María");
  });

  it("should include username in metadata when from.username is set", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({
      chatId: 101,
      from: { id: 101, is_bot: false, username: "maria_test" },
    });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    const metadata = (repo.upsertByProvider as ReturnType<typeof mock>).mock.calls[0]![2] as Record<
      string,
      unknown
    >;
    expect(metadata["username"]).toBe("maria_test");
  });

  it("should include lastName in metadata when from.last_name is set", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({
      chatId: 102,
      from: { id: 102, is_bot: false, last_name: "García" },
    });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    const metadata = (repo.upsertByProvider as ReturnType<typeof mock>).mock.calls[0]![2] as Record<
      string,
      unknown
    >;
    expect(metadata["lastName"]).toBe("García");
  });

  it("should call next() after setting context fields", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({ chatId: 200, from: { id: 200, is_bot: false } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should set userId to empty string and still call next when chat is undefined", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = makeCtx({ chatId: undefined, from: { id: 300, is_bot: false } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    expect(repo.upsertByProvider).not.toHaveBeenCalled();
    expect(ctx.userId).toBe("");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should set userId to empty string and still call next when from is undefined", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx = {
      chat: { id: 400 },
      from: undefined,
      requestId: "",
      userId: "",
    };
    const next = mock(() => Promise.resolve());

    await middleware(ctx as never, next);

    expect(repo.upsertByProvider).not.toHaveBeenCalled();
    expect(ctx.userId).toBe("");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should generate different requestIds for different updates", async () => {
    const repo = makeUserRepository();
    const middleware = createUserMiddleware(repo);
    const ctx1 = makeCtx({ chatId: 501, from: { id: 501, is_bot: false } });
    const ctx2 = makeCtx({ chatId: 502, from: { id: 502, is_bot: false } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx1 as never, next);
    await middleware(ctx2 as never, next);

    expect(ctx1.requestId).not.toBe(ctx2.requestId);
  });
});
