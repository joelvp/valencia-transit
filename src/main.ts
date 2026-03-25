import { createContainer } from "@/adapters/container";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { logger } from "@/config/logger";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { ListLines } from "@/core/application/query/ListLines";
import { GetLineStations } from "@/core/application/query/GetLineStations";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";

const container = createContainer();

logger.info({ env: container.secrets.APP_ENV }, "Starting valencia-transit");
await migrate(container.db, { migrationsFolder: "./drizzle" });
logger.info("Migrations applied");

const searchNextDepartures = new SearchNextDepartures(
  container.stationRepository,
  container.lineRepository,
  container.scheduleRepository,
  container.tripRepository,
  container.routeRepository,
  container.eventBus,
);
const listLines = new ListLines(container.lineRepository, container.stationRepository);
const getLineStations = new GetLineStations(container.lineRepository, container.stationRepository);

const botToken = "BOT_TOKEN" in container.secrets ? container.secrets.BOT_TOKEN : undefined;
const bot = new TelegramBot(
  botToken,
  searchNextDepartures,
  listLines,
  getLineStations,
  container.userRepository,
  container.eventBus,
);

logger.info("Bot starting");
await bot.start();
