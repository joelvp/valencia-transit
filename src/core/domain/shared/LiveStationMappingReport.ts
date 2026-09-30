import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

export class LiveStationMappingReport {
  constructor(
    readonly mappedCount: number,
    readonly unmatched: readonly string[],
    readonly lowConfidence: readonly string[],
  ) {
    if (!Number.isInteger(mappedCount) || mappedCount < 0) {
      throw new InvalidArgumentError(
        `mappedCount must be a non-negative integer, got ${mappedCount}`,
      );
    }
  }

  get hasIssues(): boolean {
    return this.unmatched.length > 0 || this.lowConfidence.length > 0;
  }
}
