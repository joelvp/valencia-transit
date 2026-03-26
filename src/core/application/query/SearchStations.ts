import type { Station } from "@/core/domain/station/Station";
import type { StationRepository } from "@/core/domain/station/StationRepository";

export class SearchStations {
  constructor(private readonly stationRepository: StationRepository) {}

  async execute(query: string): Promise<Station[]> {
    return this.stationRepository.searchByName(query);
  }
}
