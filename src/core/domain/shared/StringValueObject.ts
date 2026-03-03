import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

export abstract class StringValueObject {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidArgumentError(`${this.constructor.name} cannot be empty`);
    }
  }

  equals(other: StringValueObject): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
