import type { Lang } from "@/adapters/in/telegram/i18n";
import { translations } from "@/adapters/in/telegram/i18n";

const store = new Map<number, Lang>();

export function getLang(chatId: number): Lang {
  return store.get(chatId) ?? "es";
}

export function setLang(chatId: number, lang: Lang): void {
  store.set(chatId, lang);
}

export function getT(chatId: number) {
  return translations[getLang(chatId)];
}
