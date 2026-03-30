import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";

export class ChangeUserLanguage {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    chatId: number,
    lang: string,
    username?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    await this.userRepository.upsert({
      chatId,
      username,
      firstName: firstName ?? "",
      lastName,
      language: lang,
    });

    const traceId = String(chatId);
    const event = new LanguageChanged(lang, traceId);
    event.traceId = traceId;
    void this.eventBus.publish(event);
  }
}
