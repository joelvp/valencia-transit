import { describe, it, expect, mock } from "bun:test";
import { ChangeUserLanguage } from "./ChangeUserLanguage";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";

function makeRepos(): { userRepository: UserRepository; eventBus: EventBus } {
  const userRepository: UserRepository = {
    upsert: mock(() => Promise.resolve()),
    findAllLanguages: mock(() => Promise.resolve(new Map())),
  };
  const eventBus: EventBus = {
    publish: mock(() => Promise.resolve()),
  };
  return { userRepository, eventBus };
}

describe("ChangeUserLanguage", () => {
  it("should call userRepository.upsert with correct chatId and language", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(12345, "en");

    expect(userRepository.upsert).toHaveBeenCalledTimes(1);
    expect(userRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: 12345, language: "en" }),
    );
  });

  it("should publish a LanguageChanged event", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(12345, "val");

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const published = (eventBus.publish as ReturnType<typeof mock>).mock.calls[0]![0];
    expect(published).toBeInstanceOf(LanguageChanged);
  });

  it("should set correct lang in the LanguageChanged event", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(99, "en");

    const published = (eventBus.publish as ReturnType<typeof mock>).mock
      .calls[0]![0] as LanguageChanged;
    expect(published.lang).toBe("en");
  });

  it("should set chatId as traceId in the LanguageChanged event", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(42, "es");

    const published = (eventBus.publish as ReturnType<typeof mock>).mock
      .calls[0]![0] as LanguageChanged;
    expect(published.chatId).toBe("42");
    expect(published.traceId).toBe("42");
  });

  it("should pass optional username, firstName, lastName to upsert", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(777, "es", "johndoe", "John", "Doe");

    expect(userRepository.upsert).toHaveBeenCalledWith({
      chatId: 777,
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      language: "es",
    });
  });

  it("should use empty string for firstName when not provided", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(100, "val", "user123");

    expect(userRepository.upsert).toHaveBeenCalledWith(expect.objectContaining({ firstName: "" }));
  });

  it("should omit lastName from upsert when not provided", async () => {
    const { userRepository, eventBus } = makeRepos();
    const useCase = new ChangeUserLanguage(userRepository, eventBus);

    await useCase.execute(200, "en", undefined, "Maria");

    const call = (userRepository.upsert as ReturnType<typeof mock>).mock.calls[0]![0] as {
      lastName?: string;
    };
    expect(call.lastName).toBeUndefined();
  });
});
