/** An FGV API endpoint answered with a non-OK HTTP status. */
export class FgvApiError extends Error {
  readonly code = "FGV_API_ERROR";

  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`FGV ${endpoint} request failed with status ${status}`);
    this.name = "FgvApiError";
  }
}
