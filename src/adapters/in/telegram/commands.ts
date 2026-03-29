import type { Lang } from "./i18n";

interface LangCommands {
  departure: string;
  alias: string;
  lines: string;
  cancel: string;
  language: string;
  help: string;
}

export const LANG_COMMANDS: Record<Lang, LangCommands> = {
  es: {
    departure: "salida",
    alias: "s",
    lines: "lineas",
    cancel: "cancelar",
    language: "idioma",
    help: "ayuda",
  },
  val: {
    departure: "eixida",
    alias: "e",
    lines: "linies",
    cancel: "cancelar",
    language: "idioma",
    help: "ajuda",
  },
  en: {
    departure: "departure",
    alias: "d",
    lines: "lines",
    cancel: "cancel",
    language: "language",
    help: "help",
  },
};

export const DEPARTURE_COMMANDS = new Set(
  Object.values(LANG_COMMANDS).flatMap((c) => [`/${c.departure}`, `/${c.alias}`]),
);

export const CANCEL_COMMANDS = new Set(Object.values(LANG_COMMANDS).map((c) => `/${c.cancel}`));
