import { createContainer } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { ListAllStations } from "@/core/application/query/ListAllStations";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";

const container = createContainer();

const searchNextDepartures = new SearchNextDepartures(
  container.stationRepository,
  container.lineRepository,
  container.scheduleRepository,
  container.tripRepository,
  container.eventBus,
);
const listAllStations = new ListAllStations(container.stationRepository);

const botToken = "BOT_TOKEN" in container.secrets ? container.secrets.BOT_TOKEN : undefined;
const bot = new TelegramBot(botToken, searchNextDepartures, listAllStations);

await bot.start();
