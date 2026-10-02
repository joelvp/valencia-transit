import { loadSecrets } from "@/config/env";
import type { Secrets } from "@/config/env";
import { loadPublicConfig } from "@/config/environments";
import type { PublicConfig } from "@/config/environments";
import { createSqlConnection } from "@/config/database";
import { ServiceCalendar } from "@/core/domain/shared/ServiceCalendar";
import { createDatabase } from "@/adapters/out/persistence/drizzle/db";
import type { AppDatabase } from "@/adapters/out/persistence/drizzle/db";
import { TransactionManagerDrizzle } from "@/adapters/out/persistence/drizzle/TransactionManagerDrizzle";
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
import {
  FgvApiClient,
  FGV_BASE_URL,
} from "@/adapters/out/live-departures/provider-fgv/FgvApiClient";
import { FgvLiveStationCatalog } from "@/adapters/out/live-departures/provider-fgv/FgvLiveStationCatalog";
import { FgvStationIdRepositoryDrizzle } from "@/adapters/out/persistence/drizzle/repositories/FgvStationIdRepositoryDrizzle";
import type { LiveStationCatalog } from "@/core/domain/shared/LiveStationCatalog";
import type { LiveStationLinkRepository } from "@/core/domain/shared/LiveStationLinkRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";

export interface Container {
  secrets: Secrets;
  publicConfig: PublicConfig;
  serviceCalendar: ServiceCalendar;
  stationRepository: StationRepository;
  lineRepository: LineRepository;
  routeRepository: RouteRepository;
  scheduleRepository: ScheduleRepository;
  tripRepository: TripRepository;
  userRepository: UserRepository;
  eventBus: EventBus;
  transactionManager: TransactionManager;
  liveStationCatalog: LiveStationCatalog;
  liveStationLinkRepository: LiveStationLinkRepository;
  db: AppDatabase;
  dispose(): Promise<void>;
}

export function createContainer(): Container {
  const secrets = loadSecrets();
  const publicConfig = loadPublicConfig(secrets.APP_ENV);
  const serviceCalendar = new ServiceCalendar(publicConfig.timezone);
  const sql = createSqlConnection(secrets.DATABASE_URL);
  const transactionManager = new TransactionManagerDrizzle(createDatabase(sql));
  const db = transactionManager.transactionAwareDb();

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

  const liveStationCatalog = new FgvLiveStationCatalog(
    new FgvApiClient(fetch, FGV_BASE_URL, 30_000),
  );
  const liveStationLinkRepository = new FgvStationIdRepositoryDrizzle(db, "metrovalencia");

  return {
    secrets,
    publicConfig,
    serviceCalendar,
    stationRepository,
    lineRepository,
    routeRepository,
    scheduleRepository,
    tripRepository,
    userRepository,
    eventBus,
    transactionManager,
    liveStationCatalog,
    liveStationLinkRepository,
    db,
    dispose: () => sql.end(),
  };
}
