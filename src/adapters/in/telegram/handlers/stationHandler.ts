import type { Context } from "grammy";
import type { ListStationsWithLines } from "@/core/application/query/ListStationsWithLines";
import { getT } from "@/adapters/in/telegram/languageStore";
import { hexToLineEmoji } from "@/adapters/in/telegram/lineEmoji";

const MAX_CHARS = 4000;

export function stationHandler(useCase: ListStationsWithLines) {
  return async (ctx: Context): Promise<void> => {
    const t = getT(ctx.chat?.id ?? 0);
    const result = await useCase.execute();

    if (result.length === 0) {
      await ctx.reply(t.noStations, { parse_mode: "HTML" });
      return;
    }

    const lines = result.map(({ station, lines }) => {
      const lineLabels = lines
        .map((l) => `${hexToLineEmoji(l.color?.value ?? null)} ${l.name.value}`)
        .join(" · ");
      return lineLabels ? `${station.name.value}  ${lineLabels}` : station.name.value;
    });

    let isFirst = true;
    let chunk: string[] = [];
    let chunkLen = 0;

    for (const line of lines) {
      const prefix = isFirst && chunk.length === 0 ? `${t.stationsHeader}\n\n` : "";
      const added = (chunk.length > 0 ? 1 : 0) + line.length; // 1 for "\n"
      if (chunkLen + prefix.length + added > MAX_CHARS && chunk.length > 0) {
        await ctx.reply(chunk.join("\n"), { parse_mode: "HTML" });
        isFirst = false;
        chunk = [];
        chunkLen = 0;
      }
      if (isFirst && chunk.length === 0) {
        chunk.push(t.stationsHeader, "", line);
        chunkLen = t.stationsHeader.length + 1 + line.length;
        isFirst = false;
      } else {
        chunk.push(line);
        chunkLen += 1 + line.length;
      }
    }
    if (chunk.length > 0) {
      await ctx.reply(chunk.join("\n"), { parse_mode: "HTML" });
    }
  };
}
