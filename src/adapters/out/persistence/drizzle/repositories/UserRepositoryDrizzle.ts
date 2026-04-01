import { isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { UserId } from "@/core/domain/user/UserId";
import { users } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class UserRepositoryDrizzle implements UserRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async upsert(params: {
    userId: UserId;
    language?: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }): Promise<void> {
    await this.db
      .insert(users)
      .values({
        chatId: 0, // TODO: remove when schema migrates chatId out of users table
        firstName: params.userId.value,
        language: params.language ?? null,
        firstSeenAt: params.firstSeenAt,
        lastSeenAt: params.lastSeenAt,
      })
      .onConflictDoUpdate({
        target: users.chatId,
        set: {
          ...(params.language !== undefined ? { language: params.language } : {}),
          lastSeenAt: params.lastSeenAt,
        },
      });
  }

  async findLanguageByUserId(userId: UserId): Promise<string | null> {
    // TODO: implement once schema has user_id column (currently no user_id in users table)
    void userId;
    return null;
  }

  async findAllLanguages(): Promise<Map<string, string>> {
    const rows = await this.db
      .select({ chatId: users.chatId, language: users.language })
      .from(users)
      .where(isNotNull(users.language));
    return new Map(rows.map((r) => [String(r.chatId), r.language!]));
  }
}
