import type { LiveStation } from "./LiveStation";

export interface LiveStationCatalog {
  fetchAll(): Promise<LiveStation[]>;
}
