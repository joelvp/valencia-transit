import { createContainer } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { ListLines } from "@/core/application/query/ListLines";
import { GetLineStations } from "@/core/application/query/GetLineStations";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";

const container = createContainer();

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

await bot.start();
