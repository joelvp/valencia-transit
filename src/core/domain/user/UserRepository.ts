import type { UserId } from "./UserId.ts";

export interface UserRepository {
  upsert(params: {
    userId: UserId;
    language?: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }): Promise<void>;
  findLanguageByUserId(userId: UserId): Promise<string | null>;
  findAllLanguages(): Promise<Map<string, string>>;
}
