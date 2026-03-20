import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

export class LineColor {
  readonly value: string;

  constructor(value: string) {
    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      throw new InvalidArgumentError("LineColor must be a 6-character hex string (e.g., 'FFA500')");
    }
    this.value = value.toUpperCase();
  }

  equals(other: LineColor): boolean {
    return this.value === other.value;
  }
}
