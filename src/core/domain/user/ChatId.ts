import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

export class ChatId {
  constructor(readonly value: bigint) {
    if (value <= 0n) throw new InvalidArgumentError("ChatId must be greater than 0");
  }

  equals(other: ChatId): boolean {
    return this.value === other.value;
  }
}
