import type { Lang } from "./i18n";

const store = new Map<number, Lang>();

const VALID_LANGS: Lang[] = ["es", "val", "en"];

export function getLang(chatId: number): Lang {
  const lang = store.get(chatId);
  return lang && VALID_LANGS.includes(lang) ? lang : "es";
}

export function setLang(chatId: number, lang: Lang): void {
  store.set(chatId, lang);
}

export function initLanguageStore(languages: Map<number, string>): void {
  for (const [chatId, lang] of languages) {
    store.set(chatId, lang as Lang);
  }
}
