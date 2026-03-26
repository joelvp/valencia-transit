import { DomainError } from "./DomainError";

export class StationNotFoundError extends DomainError {
  readonly code = "STATION_NOT_FOUND";

  constructor(station: string) {
    super(`Station not found: "${station}"`);
  }
}
