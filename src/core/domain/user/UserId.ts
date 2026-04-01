import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UserId {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidArgumentError("UserId cannot be empty");
    }
    if (!UUID_REGEX.test(value)) {
      throw new InvalidArgumentError(`UserId must be a valid UUID v4, got: ${value}`);
    }
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
