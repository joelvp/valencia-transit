import { DomainError } from "./DomainError";

export class InvalidArgumentError extends DomainError {
  readonly code = "INVALID_ARGUMENT";

  constructor(message: string) {
    super(message);
  }
}
