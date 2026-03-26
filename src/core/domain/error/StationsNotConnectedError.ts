import { DomainError } from "./DomainError";

export class StationsNotConnectedError extends DomainError {
  readonly code = "STATIONS_NOT_CONNECTED";

  constructor(origin: string, destination: string) {
    super(`No official route connects "${origin}" and "${destination}"`);
  }
}
