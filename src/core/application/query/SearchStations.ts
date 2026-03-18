import type { Station } from "../../domain/station/Station.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";

export class SearchStations {
  constructor(private readonly stationRepository: StationRepository) {}

  async execute(query: string): Promise<Station[]> {
    return this.stationRepository.searchByName(query);
  }
}
