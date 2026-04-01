import { describe, it, expect, mock } from "bun:test";
import { ChangeUserLanguage } from "./ChangeUserLanguage";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";
import { UserId } from "@/core/domain/user/UserId";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function makeRepos(): { userRepository: UserRepository; eventBus: EventBus } {
  const userRepository: UserRepository = {
    upsert: mock(() => Promise.resolve()),
    findLanguageByUserId: mock(() => Promise.resolve(null)),
    findAllLanguages: mock(() => Promise.resolve(new Map())),
  };
  const eventBus: EventBus = {
    publish: mock(() => Promise.resolve()),
  };
  return { userRepository, eventBus };
}

describe("ChangeUserLanguage", () => {
  it("should call userRepository.upsert with correct userId and language", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);
    const userId = new UserId(validUuid);

    await useCase.execute(userId, "en");

    expect(userRepository.upsert).toHaveBeenCalledTimes(1);
    expect(userRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId, language: "en" }),
    );
  });

  it("should publish a LanguageChanged event", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(new UserId(validUuid), "val");

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const published = (eventBus.publish as ReturnType<typeof mock>).mock.calls[0]![0];
    expect(published).toBeInstanceOf(LanguageChanged);
  });

  it("should set correct lang in the LanguageChanged event", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(new UserId(validUuid), "en");

    const published = (eventBus.publish as ReturnType<typeof mock>).mock
      .calls[0]![0] as LanguageChanged;
    expect(published.lang).toBe("en");
  });

  it("should set userId as aggregateId and traceId in the LanguageChanged event", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);
    const userId = new UserId(validUuid);

    await useCase.execute(userId, "es");

    const published = (eventBus.publish as ReturnType<typeof mock>).mock
      .calls[0]![0] as LanguageChanged;
    expect(published.userId).toBe(validUuid);
    expect(published.traceId).toBe(validUuid);
  });
});
