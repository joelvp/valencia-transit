# Phase 1 — Domain Model (Entities + Value Objects + Tests) ✅

Build the core domain layer: entities, value objects, and domain errors. Pure business logic, zero infrastructure dependencies. Entities and VOs with meaningful logic have co-located unit tests. Simple VOs (string wrappers) are covered by a shared base class test.

## 1A — Value Objects ✅

**Base class (shared):**

- [x] `StringValueObject` — abstract base for all simple string VOs: non-empty validation + `equals()`. Lives in `shared/`.
- [x] `StringValueObject.test.ts` — tests validation (empty, whitespace) and equality. Covers all child VOs below.

**Simple string VOs (extend `StringValueObject`, no individual tests needed):**

- [x] `StationId`
- [x] `StationName`
- [x] `LineId`
- [x] `LineName`
- [x] `ScheduleId`
- [x] `TripId`

**Simple composite/enum VOs (no logic, no tests needed):**

- [x] `LineDirection` — enum: `OUTBOUND` | `INBOUND`
- [x] `LineStop` — composite VO: `StationId` + `sequence: number`
- [x] `PassingTime` — composite VO: `StationId` + `arrivalTime: TimeOfDay` + `departureTime: TimeOfDay` + `sequence: number`
- [x] `ScheduleException` — VO: `date: string` + `isActive: boolean`, with trivial `isServiceAdded()` / `isServiceRemoved()` (tested indirectly via `Schedule.test.ts`)

**VOs with meaningful logic (need their own co-located tests):**

- [x] `StationLocation` — latitude (-90 to 90), longitude (-180 to 180), validated in constructor
  - `StationLocation.test.ts` — boundary tests: valid ranges, exact limits, out of range
- [x] `Weekdays` — flags or bitmask for Mon-Sun, with `isActiveOnDay(dayOfWeek)` method
  - `Weekdays.test.ts` — each weekday flag, all active, none active, weekend-only
- [x] `DateRange` — start + end date strings, with `contains(date)` method
  - `DateRange.test.ts` — inside range, outside range, exact boundaries, edge cases
- [x] `TimeOfDay` — HH:MM:SS string with validation, `isAfter()`, `isBefore()`, `minutesUntilFrom()` methods
  - `TimeOfDay.test.ts` — comparison, parsing, >24:00:00 edge case (GTFS next-day trips), midnight boundary
- [x] `Departure` — computed VO: `departureTime: TimeOfDay`, `lineName: string`, `direction: LineDirection`, `minutesRemaining: number`
  - `Departure.test.ts` — minutesRemaining calculation

**Domain errors:**

- [x] `DomainError` — abstract base class for all domain errors (extends `Error`, adds structured fields)
- [x] `InvalidArgumentError` — VO validation failures (extends `DomainError`)
- [x] `StationNotFoundError` — station name/ID doesn't match any known station (extends `DomainError`)
- [x] `NoActiveServiceError` — no schedule is active for the queried date (extends `DomainError`)
- [x] `NoConnectionError` — no line connects origin and destination in order (extends `DomainError`)

## 1B — Entities ✅

- [x] `Station` — aggregate root. Constructor takes VOs. Factory method `create()` with validation.
- [x] `Line` — aggregate root. Contains `LineStop[]`. Methods:
  - `connectsInOrder(origin: StationId, destination: StationId): boolean`
  - `getSequence(stationId: StationId): number | undefined`
  - `stopsAfter(stationId: StationId): LineStop[]`
- [x] `Schedule` — aggregate root. Contains `Weekdays`, `DateRange`, `ScheduleException[]` (all VOs). Methods:
  - `isActiveOn(date: Date): boolean` (checks weekday + date range + exceptions)
- [x] `Trip` — aggregate root. Contains `PassingTime[]`, references `LineId`, `ScheduleId`. Methods:
  - `getDepartureTimeAt(stationId: StationId): TimeOfDay | undefined`
  - `passesThrough(stationId: StationId): boolean`
  - `stopsInOrder(origin: StationId, destination: StationId): boolean`
- [x] Unit tests for every entity (behavior methods, edge cases, invalid states)

## 1C — Ports (Interfaces) ✅

- [x] `StationRepository` — `findById(id: StationId)`, `findByName(name: string)`, `searchByName(query: string)`, `findAll()`
- [x] `LineRepository` — `findById(id: LineId)`, `findByStations(origin: StationId, destination: StationId)`, `findAll()`
- [x] `ScheduleRepository` — `findById(id: ScheduleId)`, `findActiveOn(date: Date)`
- [x] `TripRepository` — `findByLineAndSchedule(lineId: LineId, scheduleId: ScheduleId)`, `findDeparturesFromStation(stationId: StationId, after: TimeOfDay, activeScheduleIds: ScheduleId[])`
- [x] `EventBus` — `publish(event: DomainEvent): Promise<void>` (subscribe wired via constructor injection — see Phase 4B)

## 1D — Domain Events ✅

- [x] `DomainEvent` — abstract base: `occurredOn`, `eventName: DomainEventType`, optional `aggregateId`/`aggregateType`, optional `traceId` (no `eventId` — relies on DB serial)
- [x] `DomainEventType` — enum: `DATASET_IMPORTED`, `LANGUAGE_CHANGED`
- [x] `DatasetImported` — feedId, stationsCount, linesCount, schedulesCount, tripsCount
- [x] `LanguageChanged` — lang, userId (UUID)
- [x] `AnalyticsEvent` — abstract base: `occurredOn`, `eventName: AnalyticsEventType`, optional `userId` (UUID), optional `traceId`
- [x] `AnalyticsEventType` — enum: `DEPARTURE_SEARCHED`, `LINES_BROWSED`, `LINE_STATIONS_VIEWED`, `STATION_LOCATION_REQUESTED`, `HELP_REQUESTED`
- [x] `DepartureSearched` — originStationId, destinationStationId, resultsCount, userId?
- [x] `LinesBrowsed`, `LineStationsViewed`, `StationLocationRequested`, `HelpRequested` — userId?

**Exit criteria**: ✅ All domain code compiles with zero infrastructure imports. All entity/VO tests pass. Domain layer is a self-contained, testable unit.
