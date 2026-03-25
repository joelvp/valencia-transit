import type { ChatId } from "./ChatId.ts";

export class User {
  constructor(
    readonly chatId: ChatId,
    readonly firstName: string,
    readonly username?: string,
    readonly lastName?: string,
  ) {}

  equals(other: User): boolean {
    return this.chatId.equals(other.chatId);
  }
}
