import type { Station } from "../../domain/station/Station.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import type { ScheduleRepository } from "../../domain/schedule/ScheduleRepository.ts";
import type { TripRepository } from "../../domain/trip/TripRepository.ts";
import type { EventBus } from "../../domain/event/EventBus.ts";
import { Departure } from "../../domain/shared/Departure.ts";
import { TimeOfDay } from "../../domain/shared/TimeOfDay.ts";
import { DepartureSearched } from "../../domain/event/DepartureSearched.ts";
import { StationNotFoundError } from "../../domain/error/StationNotFoundError.ts";
import { NoConnectionError } from "../../domain/error/NoConnectionError.ts";
import { NoActiveServiceError } from "../../domain/error/NoActiveServiceError.ts";

export interface DepartureResult {
  origin: Station;
  destination: Station;
  departures: Departure[];
  searchedAt: Date;
}

export class SearchNextDepartures {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly lineRepository: LineRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly tripRepository: TripRepository,
    private readonly eventBus: EventBus,
    private readonly maxDepartures: number = 5,
  ) {}

  async execute(originName: string, destinationName: string, now: Date): Promise<DepartureResult> {
    const origin = await this.resolveStation(originName);
    const destination = await this.resolveStation(destinationName);

    const allLines = await this.lineRepository.findByStations(origin.id, destination.id);
    const connectingLines = allLines.filter((line) =>
      line.connectsInOrder(origin.id, destination.id),
    );
    if (connectingLines.length === 0) {
      throw new NoConnectionError(originName, destinationName);
    }

    const activeSchedules = await this.scheduleRepository.findActiveOn(now);
    if (activeSchedules.length === 0) {
      throw new NoActiveServiceError(now);
    }

    const currentTime = TimeOfDay.fromDate(now);
    const activeScheduleIds = activeSchedules.map((s) => s.id);
    const connectingLineIds = new Set(connectingLines.map((l) => l.id.value));

    const trips = await this.tripRepository.findDeparturesFromStation(
      origin.id,
      currentTime,
      activeScheduleIds,
    );

    const filteredTrips = trips.filter(
      (trip) =>
        connectingLineIds.has(trip.lineId.value) && trip.stopsInOrder(origin.id, destination.id),
    );

    const departures: Departure[] = [];
    for (const trip of filteredTrips) {
      const departureTime = trip.getDepartureTimeAt(origin.id);
      if (!departureTime) continue;

      const matchingLine = connectingLines.find((l) => l.id.equals(trip.lineId));
      const lineName = matchingLine ? matchingLine.name.value : trip.lineId.value;

      departures.push(new Departure(departureTime, lineName, trip.headsign, currentTime));
    }

    departures.sort((a, b) => a.departureTime.minutesUntilFrom(b.departureTime));
    const topDepartures = departures.slice(0, this.maxDepartures);

    await this.eventBus.publish(
      new DepartureSearched(origin.id.value, destination.id.value, topDepartures.length),
    );

    return {
      origin,
      destination,
      departures: topDepartures,
      searchedAt: now,
    };
  }

  private async resolveStation(name: string): Promise<Station> {
    const exact = await this.stationRepository.findByName(name);
    if (exact) return exact;

    const results = await this.stationRepository.searchByName(name);
    if (results.length === 1) return results[0]!;

    throw new StationNotFoundError(name);
  }
}
