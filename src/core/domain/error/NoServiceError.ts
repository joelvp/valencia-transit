import { DomainError } from "./DomainError";

export class NoServiceError extends DomainError {
  readonly code = "NO_SERVICE";

  constructor(origin: string, destination: string) {
    super(`No service available from "${origin}" to "${destination}"`);
  }
}
