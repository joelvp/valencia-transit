import type { LiveStation } from "./LiveStation";

/** Source of the stations a live-data provider knows about. */
export interface LiveStationCatalog {
  fetchAll(): Promise<LiveStation[]>;
}
