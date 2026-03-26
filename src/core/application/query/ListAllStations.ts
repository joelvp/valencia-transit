import type { Station } from "@/core/domain/station/Station";
import type { StationRepository } from "@/core/domain/station/StationRepository";

export class ListAllStations {
  constructor(private readonly stationRepository: StationRepository) {}

  async execute(): Promise<Station[]> {
    return this.stationRepository.findAll();
  }
}
