/** FGV sync produced no usable station mapping; the previous one is kept. */
export class FgvStationMappingError extends Error {
  readonly code = "FGV_STATION_MAPPING_ERROR";

  constructor(fgvStationCount: number, ourStationCount: number) {
    super(
      `FGV sync matched 0 of ${fgvStationCount} FGV stations (ours: ${ourStationCount}); previous mapping kept`,
    );
    this.name = "FgvStationMappingError";
  }
}
