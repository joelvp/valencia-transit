import type { Station } from "../../domain/station/Station.ts";
import type { Line } from "../../domain/line/Line.ts";
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

export type SearchResult =
  | { type: "departures"; data: DepartureResult }
  | {
      type: "disambiguation";
      field: "origin" | "destination";
      candidates: Station[];
      otherName: string;
    }
  | {
      type: "no_more_today";
      origin: Station;
      destination: Station;
      firstTomorrow: Departure | null;
    };

export class SearchNextDepartures {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly lineRepository: LineRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly tripRepository: TripRepository,
    private readonly eventBus: EventBus,
    private readonly maxDepartures: number = 5,
  ) {}

  async execute(originName: string, destinationName: string, now: Date): Promise<SearchResult> {
    const originResult = await this.resolveStation(originName);
    if (Array.isArray(originResult)) {
      return {
        type: "disambiguation",
        field: "origin",
        candidates: originResult,
        otherName: destinationName,
      };
    }

    const destResult = await this.resolveStation(destinationName);
    if (Array.isArray(destResult)) {
      return {
        type: "disambiguation",
        field: "destination",
        candidates: destResult,
        otherName: originName,
      };
    }

    const origin = originResult;
    const destination = destResult;

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

    if (topDepartures.length === 0) {
      const firstTomorrow = await this.findFirstTomorrowDeparture(
        now,
        origin,
        destination,
        connectingLines,
      );
      return { type: "no_more_today", origin, destination, firstTomorrow };
    }

    return {
      type: "departures",
      data: { origin, destination, departures: topDepartures, searchedAt: now },
    };
  }

  private async findFirstTomorrowDeparture(
    now: Date,
    origin: Station,
    destination: Station,
    connectingLines: Line[],
  ): Promise<Departure | null> {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowSchedules = await this.scheduleRepository.findActiveOn(tomorrow);
    if (tomorrowSchedules.length === 0) return null;

    const tomorrowScheduleIds = tomorrowSchedules.map((s) => s.id);
    const connectingLineIds = new Set(connectingLines.map((l) => l.id.value));
    const midnight = new TimeOfDay("00:00:00");

    const tomorrowTrips = await this.tripRepository.findDeparturesFromStation(
      origin.id,
      midnight,
      tomorrowScheduleIds,
    );

    const filtered = tomorrowTrips.filter(
      (trip) =>
        connectingLineIds.has(trip.lineId.value) && trip.stopsInOrder(origin.id, destination.id),
    );

    let earliest: Departure | null = null;
    for (const trip of filtered) {
      const departureTime = trip.getDepartureTimeAt(origin.id);
      if (!departureTime) continue;

      const matchingLine = connectingLines.find((l) => l.id.equals(trip.lineId));
      const lineName = matchingLine ? matchingLine.name.value : trip.lineId.value;
      const dep = new Departure(departureTime, lineName, trip.headsign, midnight);

      if (!earliest || departureTime.isBefore(earliest.departureTime)) {
        earliest = dep;
      }
    }

    return earliest;
  }

  private async resolveStation(name: string): Promise<Station | Station[]> {
    const exact = await this.stationRepository.findByName(name);
    if (exact) return exact;

    const results = await this.stationRepository.searchByName(name);
    if (results.length === 1) return results[0]!;
    if (results.length > 1) return results.slice(0, 5);

    throw new StationNotFoundError(name);
  }
}
