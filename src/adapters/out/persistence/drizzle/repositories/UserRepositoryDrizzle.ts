import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import { users } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class UserRepositoryDrizzle implements UserRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async upsert(user: {
    chatId: number;
    username?: string;
    firstName: string;
    lastName?: string;
  }): Promise<void> {
    await this.db
      .insert(users)
      .values({
        chatId: user.chatId,
        username: user.username ?? null,
        firstName: user.firstName,
        lastName: user.lastName ?? null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.chatId,
        set: {
          username: user.username ?? null,
          firstName: user.firstName,
          lastName: user.lastName ?? null,
          lastSeenAt: new Date(),
        },
      });
  }
}
