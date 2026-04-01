import type { Station } from "@/core/domain/station/Station";
import type { Line } from "@/core/domain/line/Line";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { RouteRepository } from "@/core/domain/route/RouteRepository";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { Departure } from "@/core/domain/shared/Departure";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { DepartureSearched } from "@/core/domain/event/DepartureSearched";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { StationsNotConnectedError } from "@/core/domain/error/StationsNotConnectedError";
import { NoServiceError } from "@/core/domain/error/NoServiceError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";

export interface DepartureResult {
  origin: Station;
  destination: Station;
  departures: Departure[];
  firstTomorrow: Departure | null;
  routeLineName: string | null;
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
      routeLineName: string | null;
    };

export class SearchNextDepartures {
  constructor(
    private readonly stationRepository: StationRepository,
    private readonly lineRepository: LineRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly tripRepository: TripRepository,
    private readonly routeRepository: RouteRepository,
    private readonly eventBus: EventBus,
    private readonly maxDepartures: number = 5,
  ) {}

  async execute(
    originName: string,
    destinationName: string,
    now: Date,
    traceId?: string,
    userId?: string,
  ): Promise<SearchResult> {
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

    const activeSchedules = await this.scheduleRepository.findActiveOn(now);
    if (activeSchedules.length === 0) {
      throw new NoActiveServiceError(now);
    }

    const currentTime = TimeOfDay.fromDate(now);
    const activeScheduleIds = activeSchedules.map((s) => s.id);

    const trips = await this.tripRepository.findDeparturesFromStation(
      origin.id,
      currentTime,
      activeScheduleIds,
    );

    // Get route→line mapping for all trips
    const routeIds = [...new Set(trips.map((t) => t.routeId))];
    const routeLineMap = await this.routeRepository.findLineIdsByRouteIds(routeIds);

    const filteredTrips = trips.filter((trip) => trip.stopsInOrder(origin.id, destination.id));

    // Lines that officially serve both stations — used only for display
    const matchingLines = await this.lineRepository.findByStationIds(origin.id, destination.id);
    const matchingLineIds = new Set(matchingLines.map((l) => l.id.value));

    if (filteredTrips.length === 0) {
      const firstTomorrow = await this.findFirstTomorrowDeparture(
        now,
        origin,
        destination,
        matchingLines,
      );
      const routeLineName = matchingLines[0]?.id.value ?? null;
      if (!firstTomorrow) {
        if (matchingLines.length === 0) {
          throw new StationsNotConnectedError(originName, destinationName);
        }
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowSchedules = await this.scheduleRepository.findActiveOn(tomorrow);
        if (tomorrowSchedules.length > 0) {
          throw new NoServiceError(originName, destinationName);
        }
        return { type: "no_more_today", origin, destination, firstTomorrow: null, routeLineName };
      }
      return { type: "no_more_today", origin, destination, firstTomorrow, routeLineName };
    }

    const departures: Departure[] = [];
    for (const trip of filteredTrips) {
      const departureTime = trip.getDepartureTimeAt(origin.id);
      if (!departureTime) continue;

      const lineId = routeLineMap.get(trip.routeId.value);
      const isOfficialLine = lineId !== undefined && matchingLineIds.has(lineId);
      const matchingLine = isOfficialLine
        ? matchingLines.find((l) => l.id.value === lineId)
        : undefined;
      const lineName = matchingLine ? matchingLine.id.value : null;
      const lineColor = matchingLine?.color?.value ?? null;

      const arrivalAtDest = trip.getDepartureTimeAt(destination.id);
      const durationMinutes = arrivalAtDest ? arrivalAtDest.minutesUntilFrom(departureTime) : null;

      departures.push(
        new Departure(
          departureTime,
          lineName,
          trip.headsign,
          currentTime,
          lineColor,
          durationMinutes,
        ),
      );
    }

    departures.sort((a, b) => a.departureTime.minutesUntilFrom(b.departureTime));
    const topDepartures = departures.slice(0, this.maxDepartures);

    const departureSearchedEvent = new DepartureSearched(
      origin.id.value,
      destination.id.value,
      topDepartures.length,
      userId,
    );
    departureSearchedEvent.traceId = traceId;
    void this.eventBus.publish(departureSearchedEvent);

    const firstTomorrow =
      topDepartures.length < this.maxDepartures
        ? await this.findFirstTomorrowDeparture(now, origin, destination, matchingLines)
        : null;

    const routeLineName = matchingLines[0]?.id.value ?? null;
    return {
      type: "departures",
      data: {
        origin,
        destination,
        departures: topDepartures,
        firstTomorrow,
        routeLineName,
        searchedAt: now,
      },
    };
  }

  private async findFirstTomorrowDeparture(
    now: Date,
    origin: Station,
    destination: Station,
    matchingLines: Line[],
  ): Promise<Departure | null> {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowSchedules = await this.scheduleRepository.findActiveOn(tomorrow);
    if (tomorrowSchedules.length === 0) return null;

    const tomorrowScheduleIds = tomorrowSchedules.map((s) => s.id);
    const matchingLineIds = new Set(matchingLines.map((l) => l.id.value));
    const midnight = new TimeOfDay("00:00:00");

    const tomorrowTrips = await this.tripRepository.findDeparturesFromStation(
      origin.id,
      midnight,
      tomorrowScheduleIds,
    );

    const tomorrowRouteIds = [...new Set(tomorrowTrips.map((t) => t.routeId))];
    const routeLineMap = await this.routeRepository.findLineIdsByRouteIds(tomorrowRouteIds);

    const filtered = tomorrowTrips.filter((trip) => trip.stopsInOrder(origin.id, destination.id));

    let earliest: Departure | null = null;
    for (const trip of filtered) {
      const departureTime = trip.getDepartureTimeAt(origin.id);
      if (!departureTime) continue;

      const lineId = routeLineMap.get(trip.routeId.value);
      const isOfficialLine = lineId !== undefined && matchingLineIds.has(lineId);
      const matchingLine = isOfficialLine
        ? matchingLines.find((l) => l.id.value === lineId)
        : undefined;
      const lineName = matchingLine ? matchingLine.id.value : null;
      const lineColor = matchingLine?.color?.value ?? null;
      const durationMinutes =
        trip.getDepartureTimeAt(destination.id)?.minutesUntilFrom(departureTime) ?? null;
      const dep = new Departure(
        departureTime,
        lineName,
        trip.headsign,
        midnight,
        lineColor,
        durationMinutes,
      );

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
