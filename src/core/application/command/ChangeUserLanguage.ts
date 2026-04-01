import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";
import type { UserId } from "@/core/domain/user/UserId";

export class ChangeUserLanguage {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(userId: UserId, lang: string): Promise<void> {
    const now = new Date();
    await this.userRepository.upsert({
      userId,
      language: lang,
      firstSeenAt: now,
      lastSeenAt: now,
    });

    const event = new LanguageChanged(lang, userId.value);
    event.traceId = userId.value;
    void this.eventBus.publish(event);
  }
}
