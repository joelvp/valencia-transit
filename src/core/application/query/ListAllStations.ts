import type { Station } from "../../domain/station/Station.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";

export class ListAllStations {
  constructor(private readonly stationRepository: StationRepository) {}

  async execute(): Promise<Station[]> {
    return this.stationRepository.findAll();
  }
}
