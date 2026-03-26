import type { StationRepository } from "@/core/domain/station/StationRepository";

export type FindStationResult =
  | { type: "not_found" }
  | { type: "unique"; stationName: string }
  | { type: "disambiguation"; candidates: { name: string }[] };

export class FindStation {
  constructor(private readonly stationRepository: StationRepository) {}

  async execute(name: string): Promise<FindStationResult> {
    const results = await this.stationRepository.searchByName(name);

    if (results.length === 0) {
      return { type: "not_found" };
    }

    if (results.length === 1) {
      return { type: "unique", stationName: results[0]!.name.value };
    }

    return {
      type: "disambiguation",
      candidates: results.map((s) => ({ name: s.name.value })),
    };
  }
}
