import { DomainError } from "./DomainError";
import type { ServiceDate } from "@/core/domain/shared/ServiceDate";

export class NoActiveServiceError extends DomainError {
  readonly code = "NO_ACTIVE_SERVICE";

  constructor(serviceDate: ServiceDate) {
    super(`No active service found for date: ${serviceDate.value}`);
  }
}
