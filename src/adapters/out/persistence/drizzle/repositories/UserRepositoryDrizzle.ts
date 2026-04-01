import { eq, and, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { UserId } from "@/core/domain/user/UserId";
import { users, userIdentities } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class UserRepositoryDrizzle implements UserRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async updateLanguage(userId: UserId, language: string): Promise<void> {
    await this.db
      .update(users)
      .set({ language, lastSeenAt: new Date() })
      .where(eq(users.id, userId.value));
  }

  async findLanguageByUserId(userId: UserId): Promise<string | null> {
    const rows = await this.db
      .select({ language: users.language })
      .from(users)
      .where(eq(users.id, userId.value));
    return rows[0]?.language ?? null;
  }

  async findAllLanguages(): Promise<Map<string, string>> {
    const rows = await this.db
      .select({ providerId: userIdentities.providerId, language: users.language })
      .from(userIdentities)
      .innerJoin(users, eq(userIdentities.userId, users.id))
      .where(
        and(eq(userIdentities.provider, "telegram"), isNotNull(users.language)),
      );
    return new Map(rows.map((r) => [r.providerId, r.language!]));
  }

  /**
   * Finds or creates a user by provider + providerId.
   * Returns the internal UUID of the user.
   */
  async upsertByProvider(
    provider: string,
    providerId: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    // Check if identity already exists
    const existing = await this.db
      .select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerId, providerId)));

    if (existing[0]) {
      // Update last_seen_at and metadata
      await this.db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, existing[0].userId));

      if (metadata !== undefined) {
        await this.db
          .update(userIdentities)
          .set({ metadata })
          .where(
            and(
              eq(userIdentities.provider, provider),
              eq(userIdentities.providerId, providerId),
            ),
          );
      }

      return existing[0].userId;
    }

    // Create new user
    const now = new Date();
    const newUser = await this.db
      .insert(users)
      .values({ firstSeenAt: now, lastSeenAt: now })
      .returning({ id: users.id });

    const userId = newUser[0]!.id;

    // Create identity
    await this.db.insert(userIdentities).values({
      userId,
      provider,
      providerId,
      metadata: metadata ?? null,
    });

    return userId;
  }
}
