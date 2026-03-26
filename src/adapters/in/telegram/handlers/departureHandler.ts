import type { Context } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { StationsNotConnectedError } from "@/core/domain/error/StationsNotConnectedError";
import { NoServiceError } from "@/core/domain/error/NoServiceError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import { getT } from "@/adapters/in/telegram/languageStore";
import { formatDepartures, formatNoMoreToday } from "./formatters";
import { logger } from "@/config/logger";
import {
  formatDisambiguation,
  buildDisambiguationKeyboard,
} from "./disambiguation";

export function departureHandler(useCase: SearchNextDepartures, userRepository: UserRepository) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(chatId);
    const text = ctx.message?.text ?? "";
    const args = text.trim().replace(/^\/\S+\s*/, "");

    if (!args) {
      await ctx.reply(t.usage, { parse_mode: "HTML" });
      return;
    }

    const parsed = parseStations(args);
    if (!parsed) {
      await ctx.reply(t.usage, { parse_mode: "HTML" });
      return;
    }

    const { originName, destinationName } = parsed;

    const traceId = String(chatId);

    logger.info({ chatId, origin: originName, dest: destinationName }, "Departure search");
    const start = Date.now();

    try {
      const result = await useCase.execute(originName, destinationName, new Date(), traceId);

      if (result.type === "disambiguation") {
        logger.info(
          { chatId, durationMs: Date.now() - start },
          "Departure search — disambiguation",
        );
        await ctx.reply(formatDisambiguation(t, result.field, result.candidates), {
          parse_mode: "HTML",
          reply_markup: buildDisambiguationKeyboard(
            result.field,
            result.candidates,
            result.otherName,
          ),
        });
        if (ctx.from) {
          await userRepository.upsert({
            chatId: ctx.from.id,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
          });
        }
        return;
      }

      if (result.type === "no_more_today") {
        logger.info({ chatId, durationMs: Date.now() - start }, "Departure search — no more today");
        await ctx.reply(
          formatNoMoreToday(
            t,
            result.origin.name.value,
            result.destination.name.value,
            result.firstTomorrow,
            result.routeLineName,
          ),
          { parse_mode: "HTML" },
        );
        if (ctx.from) {
          await userRepository.upsert({
            chatId: ctx.from.id,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
          });
        }
        return;
      }

      logger.info(
        { chatId, durationMs: Date.now() - start, results: result.data.departures.length },
        "Departure search — success",
      );
      await ctx.reply(
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
      if (ctx.from) {
        await userRepository.upsert({
          chatId: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
        });
      }
    } catch (err) {
      if (err instanceof StationNotFoundError) {
        const match = /^Station not found: "(.+)"$/.exec(err.message);
        const stationName = match ? match[1]! : "unknown";
        logger.warn({ chatId, stationName }, "Departure search — station not found");
        await ctx.reply(t.errNotFound(stationName));
      } else if (err instanceof StationsNotConnectedError) {
        logger.warn(
          { chatId, origin: originName, dest: destinationName },
          "Departure search — no connection",
        );
        await ctx.reply(t.errNoConn(originName, destinationName));
      } else if (err instanceof NoServiceError) {
        logger.warn({ chatId }, "Departure search — no service");
        await ctx.reply(t.errNoService);
      } else if (err instanceof NoActiveServiceError) {
        logger.warn({ chatId }, "Departure search — no active service");
        await ctx.reply(t.errNoService);
      } else {
        logger.error({ chatId, err }, "Departure search — unexpected error");
        await ctx.reply(t.errUnknown);
      }
    }
  };
}

function parseStations(args: string): { originName: string; destinationName: string } | null {
  // Try " - " separator: "Àngel Guimerà - Colón"
  const dashMatch = /^(.+?)\s+-\s+(.+)$/.exec(args);
  if (dashMatch) return { originName: dashMatch[1]!.trim(), destinationName: dashMatch[2]!.trim() };

  // Try " a " separator: "Àngel Guimerà a Colón"
  const aMatch = /^(.+?)\sa\s(.+)$/.exec(args);
  if (aMatch) return { originName: aMatch[1]!.trim(), destinationName: aMatch[2]!.trim() };

  // Fallback: first word = origin, rest = destination
  const spaceIdx = args.indexOf(" ");
  if (spaceIdx === -1) return null;
  return { originName: args.slice(0, spaceIdx), destinationName: args.slice(spaceIdx + 1) };
}
