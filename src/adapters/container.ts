import { loadSecrets } from "@/config/env";
import type { Secrets } from "@/config/env";
import { createSqlConnection } from "@/config/database";
import { createDatabase } from "@/adapters/out/persistence/drizzle/db";
import type { AppDatabase } from "@/adapters/out/persistence/drizzle/db";
import { StationRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/StationRepositoryDrizzle";
import { LineRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/LineRepositoryDrizzle";
import { RouteRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/RouteRepositoryDrizzle";
import { ScheduleRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/ScheduleRepositoryDrizzle";
import { TripRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/TripRepositoryDrizzle";
import { DomainEventRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/DomainEventRepositoryDrizzle";
import { AnalyticsEventRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/AnalyticsEventRepositoryDrizzle";
import { UserRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/UserRepositoryDrizzle";
import { PersistDomainEventsSubscriber } from "@/core/application/event/PersistDomainEventsSubscriber";
import { PersistAnalyticsEventsSubscriber } from "@/core/application/event/PersistAnalyticsEventsSubscriber";
import { InMemoryEventBus } from "@/adapters/out/event-bus/InMemoryEventBus";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import type { RouteRepository } from "@/core/domain/route/RouteRepository";
import type { ScheduleRepository } from "@/core/domain/schedule/ScheduleRepository";
import type { TripRepository } from "@/core/domain/trip/TripRepository";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";

export interface Container {
  secrets: Secrets;
  stationRepository: StationRepository;
  lineRepository: LineRepository;
  routeRepository: RouteRepository;
  scheduleRepository: ScheduleRepository;
  tripRepository: TripRepository;
  userRepository: UserRepository;
  eventBus: EventBus;
  db: AppDatabase;
  dispose(): Promise<void>;
}

export function createContainer(): Container {
  const secrets = loadSecrets();
  const sql = createSqlConnection(secrets.DATABASE_URL);
  const db = createDatabase(sql);

  const stationRepository = new StationRepositoryDrizzle(db);
  const lineRepository = new LineRepositoryDrizzle(db);
  const routeRepository = new RouteRepositoryDrizzle(db);
  const scheduleRepository = new ScheduleRepositoryDrizzle(db);
  const tripRepository = new TripRepositoryDrizzle(db);
  const domainEventRepository = new DomainEventRepositoryDrizzle(db);
  const analyticsEventRepository = new AnalyticsEventRepositoryDrizzle(db);
  const userRepository = new UserRepositoryDrizzle(db);

  const persistDomainEvents = new PersistDomainEventsSubscriber(domainEventRepository);
  const persistAnalyticsEvents = new PersistAnalyticsEventsSubscriber(analyticsEventRepository);
  const eventBus = new InMemoryEventBus([persistDomainEvents, persistAnalyticsEvents]);

  return {
    secrets,
    stationRepository,
    lineRepository,
    routeRepository,
    scheduleRepository,
    tripRepository,
    userRepository,
    eventBus,
    db,
    dispose: () => sql.end(),
  };
}
