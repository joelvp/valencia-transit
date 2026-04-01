import type { UserId } from "./UserId.ts";

export class User {
  constructor(
    readonly userId: UserId,
    readonly language: string | undefined,
    readonly firstSeenAt: Date,
    readonly lastSeenAt: Date,
  ) {}

  equals(other: User): boolean {
    return this.userId.equals(other.userId);
  }
}
