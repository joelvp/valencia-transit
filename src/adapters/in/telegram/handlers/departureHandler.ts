import type { Context } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { Departure } from "@/core/domain/shared/Departure";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";

export function departureHandler(useCase: SearchNextDepartures) {
  return async (ctx: Context): Promise<void> => {
    const text = ctx.message?.text ?? "";
    const args = text.trim().replace(/^\/\S+\s*/, "");

    if (!args) {
      await ctx.reply("⚠️ Usage: /salida <origin> - <destination>");
      return;
    }

    const parsed = parseStations(args);
    if (!parsed) {
      await ctx.reply("⚠️ Usage: /salida <origin> - <destination>");
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());
      await ctx.reply(
        formatDepartures(
          result.origin.name.value,
          result.destination.name.value,
          result.departures,
        ),
      );
    } catch (err) {
      if (err instanceof StationNotFoundError) {
        const match = /^Station not found: "(.+)"$/.exec(err.message);
        const stationName = match ? match[1] : "unknown";
        await ctx.reply(`❌ Station not found: ${stationName}`);
      } else if (err instanceof NoConnectionError) {
        await ctx.reply(`❌ No connection found between ${originName} and ${destinationName}`);
      } else if (err instanceof NoActiveServiceError) {
        await ctx.reply("❌ No active service at this time");
      } else {
        await ctx.reply("❌ An unexpected error occurred. Please try again later.");
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

function formatDepartures(origin: string, destination: string, departures: Departure[]): string {
  const header = `🚇 ${origin} → ${destination}`;
  const lines = departures.map((d, i) => {
    const h = String(d.departureTime.hours).padStart(2, "0");
    const m = String(d.departureTime.minutes).padStart(2, "0");
    const time = `${h}:${m}`;
    return `${i + 1}. ${time} (in ${d.minutesRemaining} min) — ${d.lineName}`;
  });

  return [
    header,
    "",
    "Next departures:",
    ...lines,
    "",
    "ℹ️ Planned schedules. Real times may vary.",
  ].join("\n");
}
