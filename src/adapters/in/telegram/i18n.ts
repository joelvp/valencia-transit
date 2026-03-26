import i18next from "i18next";
import es from "./locales/es.json";
import val from "./locales/val.json";
import en from "./locales/en.json";

export type Lang = "es" | "val" | "en";

export async function initI18n(): Promise<void> {
  await i18next.init({
    resources: {
      es: { translation: es },
      val: { translation: val },
      en: { translation: en },
    },
    lng: "es",
    fallbackLng: "es",
    interpolation: { escapeValue: false },
  });
}

export function getT(lang: Lang) {
  return i18next.getFixedT(lang);
}
