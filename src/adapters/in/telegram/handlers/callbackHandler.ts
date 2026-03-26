import type { Context } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { GetLineStations } from "@/core/application/query/GetLineStations";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { StationLocationRequested } from "@/core/domain/event/StationLocationRequested";
import { LineStationsViewed } from "@/core/domain/event/LineStationsViewed";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { StationsNotConnectedError } from "@/core/domain/error/StationsNotConnectedError";
import { NoServiceError } from "@/core/domain/error/NoServiceError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import { getT } from "@/adapters/in/telegram/i18n";
import { getLang } from "@/adapters/in/telegram/languageStore";
import {
  setConversationState,
  clearConversationState,
} from "@/adapters/in/telegram/conversationStore";
import { formatDepartures, formatNoMoreToday } from "./formatters";
import { formatDisambiguation, buildDisambiguationKeyboard } from "./disambiguation";
import { lineNumberToEmoji, lineNumberToHeaderEmoji } from "@/adapters/in/telegram/lineEmoji";
import { logger } from "@/config/logger";
import { handleLanguageCallback } from "./languageHandler";
import type { Lang } from "@/adapters/in/telegram/i18n";

export function callbackHandler(
  useCase: SearchNextDepartures,
  getLineStations: GetLineStations,
  userRepository: UserRepository,
  eventBus: EventBus,
  setCommandsForChat: (chatId: number, lang: Lang) => Promise<void>,
) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const traceId = String(ctx.chat?.id ?? ctx.from?.id ?? 0);
    const start = Date.now();
    logger.info({ chatId, callback: data.split("|")[0] }, "Callback received");

    if (ctx.from) {
      await userRepository.upsert({
        chatId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });
    }

    // Handle language callback
    if (data.startsWith("lang|")) {
      const lang = data.split("|")[1] as Lang;
      if (lang !== "es" && lang !== "val" && lang !== "en") {
        await ctx.answerCallbackQuery({ text: t("errInvalidData") });
        return;
      }
      await handleLanguageCallback(ctx, lang, setCommandsForChat, userRepository, eventBus);
      return;
    }

    // Handle line stations callback
    if (data.startsWith("li|")) {
      const parts = data.split("|");
      const lineId = parts[1];
      if (!lineId) {
        await ctx.answerCallbackQuery({ text: t("errInvalidData") });
        return;
      }

      const result = await getLineStations.execute(lineId);
      if (!result) {
        await ctx.answerCallbackQuery({ text: t("errLineNotFound") });
        return;
      }

      await ctx.answerCallbackQuery();
      const transportEmoji = lineNumberToHeaderEmoji(result.line.id.value);
      const colorEmoji = lineNumberToEmoji(result.line.id.value);
      const from = result.stations[0]?.name ?? "";
      const to = result.stations[result.stations.length - 1]?.name ?? "";
      const header = `${transportEmoji} ${colorEmoji} <b>L${result.line.id.value}: ${from} → ${to}</b>`;
      const locationButtons = result.stations.map((s, i) => [
        {
          text: `${i + 1}. ${s.name}`,
          callback_data: `loc|${s.id}|${s.latitude.toFixed(6)}|${s.longitude.toFixed(6)}`,
        },
      ]);

      await ctx.reply(header, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: locationButtons },
      });
      const lineStationsViewedEvent = new LineStationsViewed(result.line.id.value);
      lineStationsViewedEvent.traceId = traceId;
      void eventBus.publish(lineStationsViewedEvent);
      logger.info(
        { chatId, lineId: result.line.id.value, durationMs: Date.now() - start },
        "Line stations viewed",
      );
      return;
    }

    // Handle location callback
    if (data.startsWith("loc|")) {
      const parts = data.split("|");
      const stationId = parts[1] ?? "";
      const lat = parseFloat(parts[2] ?? "");
      const lon = parseFloat(parts[3] ?? "");
      if (!stationId || isNaN(lat) || isNaN(lon)) {
        await ctx.answerCallbackQuery({ text: t("errInvalidData") });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.replyWithLocation(lat, lon);
      const stationLocationRequestedEvent = new StationLocationRequested(stationId);
      stationLocationRequestedEvent.traceId = traceId;
      void eventBus.publish(stationLocationRequestedEvent);
      logger.info(
        { chatId, stationId, durationMs: Date.now() - start },
        "Station location requested",
      );
      return;
    }

    // Handle salida wizard callbacks
    if (data.startsWith("sw|")) {
      const parts = data.split("|");
      const subType = parts[1];

      if (subType === "o") {
        // sw|o|StationName — origin resolved, ask for destination
        const stationName = parts[2];
        if (!stationName) {
          await ctx.answerCallbackQuery({ text: t("errInvalidData") });
          return;
        }
        setConversationState(chatId, { step: "awaiting_destination", originName: stationName });
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(t("askDestination"));
        return;
      }

      if (subType === "d") {
        // sw|d|StationName|OriginName — destination resolved, execute search
        const destinationName = parts[2];
        const originName = parts[3];
        if (!destinationName || !originName) {
          await ctx.answerCallbackQuery({ text: t("errInvalidData") });
          return;
        }
        clearConversationState(chatId);
        try {
          const result = await useCase.execute(originName, destinationName, new Date());

          if (result.type === "disambiguation") {
            await ctx.answerCallbackQuery();
            await ctx.editMessageText(formatDisambiguation(t, result.field), {
              parse_mode: "HTML",
              reply_markup: buildDisambiguationKeyboard(
                result.field,
                result.candidates,
                result.otherName,
              ),
            });
            return;
          }

          if (result.type === "no_more_today") {
            await ctx.answerCallbackQuery();
            await ctx.editMessageText(
              formatNoMoreToday(
                t,
                result.origin.name.value,
                result.destination.name.value,
                result.firstTomorrow,
                result.routeLineName,
              ),
              { parse_mode: "HTML" },
            );
            return;
          }

          await ctx.answerCallbackQuery();
          await ctx.editMessageText(
            formatDepartures(
              t,
              result.data.origin.name.value,
              result.data.destination.name.value,
              result.data.departures,
              result.data.firstTomorrow,
              result.data.routeLineName,
            ),
            { parse_mode: "HTML" },
          );
          logger.info(
            { chatId, durationMs: Date.now() - start, results: result.data.departures.length },
            "Wizard callback departure search — success",
          );
        } catch (err) {
          logger.error({ chatId, err }, "Wizard callback departure search — error");
          await answerWithError(ctx, err, t, originName, destinationName);
        }
        return;
      }

      await ctx.answerCallbackQuery({ text: t("errInvalidData") });
      return;
    }

    const parsed = parseCallbackData(data);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: t("errInvalidData") });
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());

      if (result.type === "disambiguation") {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(formatDisambiguation(t, result.field), {
          parse_mode: "HTML",
          reply_markup: buildDisambiguationKeyboard(
            result.field,
            result.candidates,
            result.otherName,
          ),
        });
        return;
      }

      if (result.type === "no_more_today") {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          formatNoMoreToday(
            t,
            result.origin.name.value,
            result.destination.name.value,
            result.firstTomorrow,
            result.routeLineName,
          ),
          { parse_mode: "HTML" },
        );
        return;
      }

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        formatDepartures(
          t,
          result.data.origin.name.value,
          result.data.destination.name.value,
          result.data.departures,
          result.data.firstTomorrow,
          result.data.routeLineName,
        ),
        { parse_mode: "HTML" },
      );
      logger.info(
        { chatId, durationMs: Date.now() - start, results: result.data.departures.length },
        "Callback departure search — success",
      );
    } catch (err) {
      logger.error({ chatId, err }, "Callback departure search — error");
      await answerWithError(ctx, err, t, originName, destinationName);
    }
  };
}

async function answerWithError(
  ctx: Context,
  err: unknown,
  t: ReturnType<typeof getT>,
  originName: string,
  destinationName: string,
): Promise<void> {
  if (err instanceof StationNotFoundError) {
    const match = /^Station not found: "(.+)"$/.exec((err as Error).message);
    const name = match ? match[1]! : "unknown";
    await ctx.answerCallbackQuery({ text: t("errNotFound", { name }) });
  } else if (err instanceof StationsNotConnectedError) {
    await ctx.answerCallbackQuery({
      text: t("errNoConn", { origin: originName, destination: destinationName }),
    });
  } else if (err instanceof NoServiceError || err instanceof NoActiveServiceError) {
    await ctx.answerCallbackQuery({ text: t("errNoService") });
  } else {
    await ctx.answerCallbackQuery({ text: t("errUnknown") });
  }
}

function parseCallbackData(data: string): { originName: string; destinationName: string } | null {
  // Format: d|o|StationName|OtherName or d|d|OtherName|StationName
  const parts = data.split("|");
  if (parts.length !== 4 || parts[0] !== "d") return null;

  const field = parts[1];
  if (field === "o") {
    return { originName: parts[2]!, destinationName: parts[3]! };
  } else if (field === "d") {
    return { originName: parts[3]!, destinationName: parts[2]! };
  }

  return null;
}
