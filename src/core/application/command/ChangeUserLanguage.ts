import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";
import type { UserId } from "@/core/domain/user/UserId";

export class ChangeUserLanguage {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(userId: UserId, lang: string, traceId?: string): Promise<void> {
    await this.userRepository.updateLanguage(userId, lang);

    void this.eventBus.publish(new LanguageChanged(lang, userId.value, traceId));
  }
}
