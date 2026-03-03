import { DomainError } from "./DomainError.ts";

export class NoActiveServiceError extends DomainError {
  readonly code = "NO_ACTIVE_SERVICE";

  constructor(date: Date) {
    super(`No active service found for date: ${date.toISOString().split("T")[0]}`);
  }
}
