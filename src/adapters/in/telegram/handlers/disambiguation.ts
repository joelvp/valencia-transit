import { InlineKeyboard } from "grammy";
import type { Station } from "@/core/domain/station/Station";
import { getT } from "@/adapters/in/telegram/i18n";

export function formatDisambiguation(
  t: ReturnType<typeof getT>,
  field: "origin" | "destination",
): string {
  const key = field === "origin" ? "disambiguationOrigin" : "disambiguationDestination";
  return t(key);
}

export function buildDisambiguationKeyboard(
  field: "origin" | "destination",
  candidates: Station[],
  otherName: string,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const candidate of candidates) {
    const f = field === "origin" ? "o" : "d";
    const data = `d|${f}|${candidate.name.value}|${otherName}`;
    keyboard.text(candidate.name.value, data.slice(0, 64)).row();
  }
  return keyboard;
}
