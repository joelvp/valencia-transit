import { createContainer } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { ListStationsWithLines } from "@/core/application/query/ListStationsWithLines";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";

const container = createContainer();

const searchNextDepartures = new SearchNextDepartures(
  container.stationRepository,
  container.lineRepository,
  container.scheduleRepository,
  container.tripRepository,
  container.eventBus,
);
const listStationsWithLines = new ListStationsWithLines(
  container.stationRepository,
  container.lineRepository,
);

const botToken = "BOT_TOKEN" in container.secrets ? container.secrets.BOT_TOKEN : undefined;
const bot = new TelegramBot(botToken, searchNextDepartures, listStationsWithLines);

await bot.start();
