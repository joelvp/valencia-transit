import type { Station } from "@/core/domain/station/Station";
import type { Line } from "@/core/domain/line/Line";
import type { StationId } from "@/core/domain/station/StationId";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { RouteRepository } from "@/core/domain/route/RouteRepository";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { Trip } from "@/core/domain/trip/Trip";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { LiveDepartureProvider } from "@/core/domain/shared/LiveDepartureProvider";
import type { LiveArrival } from "@/core/domain/shared/LiveArrival";
import { Departure } from "@/core/domain/shared/Departure";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import type { ServiceCalendar } from "@/core/domain/shared/ServiceCalendar";
import type { ServiceDate } from "@/core/domain/shared/ServiceDate";
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
  // Window used to match a live departure against its likely static counterpart: wide looking
  // backward (a live estimate is almost always the same physical train running late), narrow
  // looking forward (static is rarely later than live by more than a couple minutes).
  private static readonly LIVE_MATCH_MINUTES_BEFORE = 30;
  private static readonly LIVE_MATCH_MINUTES_AFTER = 5;

  constructor(
    private readonly stationRepository: StationRepository,
    private readonly lineRepository: LineRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly tripRepository: TripRepository,
    private readonly routeRepository: RouteRepository,
    private readonly eventBus: EventBus,
    private readonly serviceCalendar: ServiceCalendar,
    private readonly maxDepartures: number = 5,
    private readonly liveDepartureProvider?: LiveDepartureProvider,
  ) {}

  async execute(
    originName: string,
    destinationName: string,
    now: Date,
    userId?: string,
    traceId?: string,
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

    const today = this.serviceCalendar.serviceDateOf(now);

    // Yesterday's schedule may still have pending post-midnight (24:xx) departures.
    const [activeSchedules, previousSchedules] = await Promise.all([
      this.scheduleRepository.findActiveOn(today),
      this.scheduleRepository.findActiveOn(today.previous()),
    ]);
    if (activeSchedules.length === 0) {
      throw new NoActiveServiceError(today);
    }

    const currentTime = this.serviceCalendar.timeOfDayOf(now);
    const activeScheduleIds = activeSchedules.map((s) => s.id);
    const extendedCurrentTime = TimeOfDay.of(
      currentTime.hours + 24,
      currentTime.minutes,
      currentTime.seconds,
    );
    const previousScheduleIds = previousSchedules.map((s) => s.id);

    const [todayTrips, crossoverTrips] = await Promise.all([
      this.tripRepository.findDeparturesFromStation(origin.id, currentTime, activeScheduleIds),
      previousScheduleIds.length > 0
        ? this.tripRepository.findDeparturesFromStation(
            origin.id,
            extendedCurrentTime,
            previousScheduleIds,
          )
        : Promise.resolve<Trip[]>([]),
    ]);
    const crossoverReferenceTime = extendedCurrentTime;

    const trips = [...crossoverTrips, ...todayTrips];

    // Get route→line mapping for all trips
    const routeIds = [...new Set(trips.map((t) => t.routeId))];
    const routeLineMap = await this.routeRepository.findLineIdsByRouteIds(routeIds);

    const filteredCrossoverTrips = crossoverTrips.filter((trip) =>
      trip.stopsInOrder(origin.id, destination.id),
    );
    const filteredTodayTrips = todayTrips.filter((trip) =>
      trip.stopsInOrder(origin.id, destination.id),
    );
    const filteredTrips = [...filteredCrossoverTrips, ...filteredTodayTrips];

    // Lines that officially serve both stations — used only for display
    const matchingLines = await this.lineRepository.findByStationIds(origin.id, destination.id);
    const matchingLineIds = new Set(matchingLines.map((l) => l.id.value));

    if (filteredTrips.length === 0) {
      const firstTomorrow = await this.findFirstTomorrowDeparture(
        today,
        origin,
        destination,
        matchingLines,
      );
      const routeLineName = matchingLines[0]?.id.value ?? null;
      if (!firstTomorrow) {
        if (matchingLines.length === 0) {
          throw new StationsNotConnectedError(originName, destinationName);
        }
        const tomorrowSchedules = await this.scheduleRepository.findActiveOn(today.next());
        if (tomorrowSchedules.length > 0) {
          throw new NoServiceError(originName, destinationName);
        }
        return { type: "no_more_today", origin, destination, firstTomorrow: null, routeLineName };
      }
      return { type: "no_more_today", origin, destination, firstTomorrow, routeLineName };
    }

    const scheduledDepartures = this.buildScheduledDepartures(
      filteredCrossoverTrips,
      crossoverReferenceTime,
      filteredTodayTrips,
      currentTime,
      origin.id,
      destination.id,
      routeLineMap,
      matchingLines,
      matchingLineIds,
    );

    const liveDepartures = await this.tryLiveDepartures(
      origin.id,
      now,
      currentTime,
      filteredTrips,
      matchingLines,
      matchingLineIds,
    );

    // No cross-source id exists to correlate a live arrival with its static counterpart (FGV
    // doesn't expose one reliably), so we approximate: same line+headsign, static departureTime
    // within a window around the live one (wide looking backward, narrow looking forward — a
    // live estimate is almost always the same physical train running late, rarely earlier).
    const prunedScheduledDepartures = this.pruneStaticDuplicates(
      liveDepartures,
      scheduledDepartures,
    );

    const topDepartures = [...liveDepartures, ...prunedScheduledDepartures]
      .sort((a, b) => a.minutesRemaining - b.minutesRemaining)
      .slice(0, this.maxDepartures);

    void this.eventBus.publish(
      new DepartureSearched(
        origin.id.value,
        destination.id.value,
        topDepartures.length,
        userId,
        traceId,
      ),
    );

    const firstTomorrow =
      topDepartures.length < this.maxDepartures
        ? await this.findFirstTomorrowDeparture(today, origin, destination, matchingLines)
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
    today: ServiceDate,
    origin: Station,
    destination: Station,
    matchingLines: Line[],
  ): Promise<Departure | null> {
    const tomorrowSchedules = await this.scheduleRepository.findActiveOn(today.next());
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

  /**
   * Removes, from `staticDepartures`, the single closest static candidate for each live
   * departure — same lineName + headsign, and a departureTime within
   * [-LIVE_MATCH_MINUTES_BEFORE, +LIVE_MATCH_MINUTES_AFTER] minutes of the live one. This is an
   * approximate heuristic (no cross-source trip id exists): a wrong match at worst prunes a
   * static entry that wasn't the true counterpart, but the top-up still fills from whatever
   * remains, so no real departure silently disappears.
   */
  private pruneStaticDuplicates(
    liveDepartures: Departure[],
    staticDepartures: Departure[],
  ): Departure[] {
    const remaining = [...staticDepartures];

    for (const live of liveDepartures) {
      let bestIndex = -1;
      let bestDiff = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        if (candidate.lineName !== live.lineName || candidate.headsign !== live.headsign) continue;

        const diffMinutes = candidate.departureTime.minutesUntilFrom(live.departureTime);
        if (
          diffMinutes < -SearchNextDepartures.LIVE_MATCH_MINUTES_BEFORE ||
          diffMinutes > SearchNextDepartures.LIVE_MATCH_MINUTES_AFTER
        ) {
          continue;
        }

        const absDiff = Math.abs(diffMinutes);
        if (absDiff < bestDiff) {
          bestDiff = absDiff;
          bestIndex = i;
        }
      }

      if (bestIndex !== -1) {
        remaining.splice(bestIndex, 1);
      }
    }

    return remaining;
  }

  private buildScheduledDepartures(
    filteredCrossoverTrips: Trip[],
    crossoverReferenceTime: TimeOfDay,
    filteredTodayTrips: Trip[],
    currentTime: TimeOfDay,
    originId: StationId,
    destinationId: StationId,
    routeLineMap: Map<string, string>,
    matchingLines: Line[],
    matchingLineIds: Set<string>,
  ): Departure[] {
    const buildOne = (trip: Trip, referenceTime: TimeOfDay): Departure | null => {
      const departureTime = trip.getDepartureTimeAt(originId);
      if (!departureTime) return null;

      const lineId = routeLineMap.get(trip.routeId.value);
      const isOfficialLine = lineId !== undefined && matchingLineIds.has(lineId);
      const matchingLine = isOfficialLine
        ? matchingLines.find((l) => l.id.value === lineId)
        : undefined;
      const lineName = matchingLine ? matchingLine.id.value : null;
      const lineColor = matchingLine?.color?.value ?? null;

      const arrivalAtDest = trip.getDepartureTimeAt(destinationId);
      const durationMinutes = arrivalAtDest ? arrivalAtDest.minutesUntilFrom(departureTime) : null;

      return new Departure(
        departureTime,
        lineName,
        trip.headsign,
        referenceTime,
        lineColor,
        durationMinutes,
        "scheduled",
      );
    };

    const departures: Departure[] = [];
    for (const trip of filteredCrossoverTrips) {
      const dep = buildOne(trip, crossoverReferenceTime);
      if (dep) departures.push(dep);
    }
    for (const trip of filteredTodayTrips) {
      const dep = buildOne(trip, currentTime);
      if (dep) departures.push(dep);
    }

    departures.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
    return departures;
  }

  /** Trusts a live arrival only once its line+direction matches what filteredTrips already confirmed; any failure falls back to []. */
  private async tryLiveDepartures(
    originId: StationId,
    now: Date,
    currentTime: TimeOfDay,
    filteredTrips: Trip[],
    matchingLines: Line[],
    matchingLineIds: Set<string>,
  ): Promise<Departure[]> {
    if (!this.liveDepartureProvider) return [];

    try {
      const validHeadsigns = new Set(
        filteredTrips.map((trip) => trip.headsign).filter((h): h is string => h !== null),
      );

      const arrivals = await this.liveDepartureProvider.findLiveArrivals(originId, now);

      return arrivals
        .filter(
          (arrival) =>
            matchingLineIds.has(arrival.lineId.value) &&
            (validHeadsigns.size === 0 ||
              (arrival.headsign !== null && validHeadsigns.has(arrival.headsign))),
        )
        .sort((a, b) => a.minutesRemaining - b.minutesRemaining)
        .map((arrival) => this.buildLiveDeparture(arrival, currentTime, matchingLines));
    } catch {
      return [];
    }
  }

  private buildLiveDeparture(
    arrival: LiveArrival,
    currentTime: TimeOfDay,
    matchingLines: Line[],
  ): Departure {
    const matchingLine = matchingLines.find((l) => l.id.equals(arrival.lineId));
    const lineName = matchingLine ? matchingLine.id.value : null;
    const lineColor = matchingLine?.color?.value ?? null;
    const departureTime = SearchNextDepartures.addMinutes(currentTime, arrival.minutesRemaining);

    return new Departure(
      departureTime,
      lineName,
      arrival.headsign,
      currentTime,
      lineColor,
      null,
      "live",
    );
  }

  /** Synthesizes a TimeOfDay `minutes` ahead of `base`, clamped to avoid a negative time. */
  private static addMinutes(base: TimeOfDay, minutes: number): TimeOfDay {
    const totalSeconds = Math.max(
      base.hours * 3600 + base.minutes * 60 + base.seconds + Math.round(minutes) * 60,
      0,
    );
    return TimeOfDay.of(
      Math.floor(totalSeconds / 3600),
      Math.floor((totalSeconds % 3600) / 60),
      totalSeconds % 60,
    );
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
