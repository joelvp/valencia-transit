import { DomainError } from "./DomainError.ts";

export class NoConnectionError extends DomainError {
  readonly code = "NO_CONNECTION";

  constructor(origin: string, destination: string) {
    super(`No connection found from "${origin}" to "${destination}"`);
  }
}
