import { db } from "@/adapters/out/persistence/drizzle/db";
import { StationRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/StationRepositoryDrizzle";
import { LineRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/LineRepositoryDrizzle";
import { ScheduleRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/ScheduleRepositoryDrizzle";
import { TripRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/TripRepositoryDrizzle";
import { DomainEventRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/DomainEventRepositoryDrizzle";
import { PersistAllEventsSubscriber } from "@/core/application/event/PersistAllEventsSubscriber";
import { InMemoryEventBus } from "@/adapters/out/event-bus/InMemoryEventBus";

// Driven adapters
export const stationRepository = new StationRepositoryDrizzle(db);
export const lineRepository = new LineRepositoryDrizzle(db);
export const scheduleRepository = new ScheduleRepositoryDrizzle(db);
export const tripRepository = new TripRepositoryDrizzle(db);
export const domainEventRepository = new DomainEventRepositoryDrizzle(db);

// Subscribers
const persistAllEvents = new PersistAllEventsSubscriber(domainEventRepository);

// Event bus
export const eventBus = new InMemoryEventBus([persistAllEvents]);
