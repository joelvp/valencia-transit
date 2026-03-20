export type Lang = "es" | "val";

export interface Translations {
  // Usage / help
  usage: string;
  helpText: string;
  // Departures
  nextDepartures: string;
  disclaimer: string;
  noMoreToday: (origin: string, dest: string) => string;
  firstTomorrow: (time: string, line: string) => string;
  // Stations
  stationsHeader: string;
  noStations: string;
  // Disambiguation
  disambiguation: (field: "origin" | "destination", names: string) => string;
  // Errors
  errNotFound: (name: string) => string;
  errNoConn: (origin: string, dest: string) => string;
  errNoService: string;
  errUnknown: string;
  // Language command
  langChanged: string;
  langUnknown: string;
  // Callback errors
  errInvalidData: string;
  errStillAmbiguous: string;
}

const es: Translations = {
  usage: "⚠️ Uso: /salida &lt;origen&gt; - &lt;destino&gt;",
  helpText: [
    "🤖 <b>Valencia Transit Bot</b>",
    "",
    "Comandos disponibles:",
    "/salida &lt;origen&gt; - &lt;destino&gt; — Próximas salidas entre dos estaciones",
    "/s &lt;origen&gt; - &lt;destino&gt; — Atajo para /salida",
    "/paradas — Listar estaciones",
    "/idioma es | val — Cambiar idioma",
    "/help — Mostrar esta ayuda",
  ].join("\n"),
  nextDepartures: "Próximas salidas:",
  disclaimer: "ℹ️ Horarios planificados. Los tiempos reales pueden variar.",
  noMoreToday: (o, d) => `No hay más salidas hoy de ${o} a ${d}.`,
  firstTomorrow: (time, line) => `🌅 Primera salida mañana: <b>${time}</b> — ${line}`,
  stationsHeader: "🚉 <b>Estaciones disponibles:</b>",
  noStations: "ℹ️ No hay estaciones disponibles.",
  disambiguation: (field, names) => {
    const label = field === "origin" ? "origen" : "destino";
    return `🔍 Varias estaciones encontradas como ${label}: ${names}\n\n¿Cuál querías decir?`;
  },
  errNotFound: (name) => `❌ Estación no encontrada: ${name}`,
  errNoConn: (o, d) => `❌ No hay conexión entre ${o} y ${d}`,
  errNoService: "❌ No hay servicio activo en este momento",
  errUnknown: "❌ Error inesperado. Inténtalo de nuevo más tarde.",
  langChanged: "Idioma cambiado a Español 🇪🇸",
  langUnknown: "Idioma no reconocido. Usa /idioma es o /idioma val",
  errInvalidData: "Datos inválidos",
  errStillAmbiguous: "Aún hay ambigüedad",
};

const val: Translations = {
  usage: "⚠️ Ús: /salida &lt;origen&gt; - &lt;destí&gt;",
  helpText: [
    "🤖 <b>Valencia Transit Bot</b>",
    "",
    "Comandos disponibles:",
    "/salida &lt;origen&gt; - &lt;destí&gt; — Pròximes eixides entre dos estacions",
    "/s &lt;origen&gt; - &lt;destí&gt; — Drecera per a /salida",
    "/paradas — Llistar estacions",
    "/idioma es | val — Canviar idioma",
    "/help — Mostrar aquesta ajuda",
  ].join("\n"),
  nextDepartures: "Pròximes eixides:",
  disclaimer: "ℹ️ Horaris planificats. Els temps reals poden variar.",
  noMoreToday: (o, d) => `No hi ha més eixides hui de ${o} a ${d}.`,
  firstTomorrow: (time, line) => `🌅 Primera eixida demà: <b>${time}</b> — ${line}`,
  stationsHeader: "🚉 <b>Estacions disponibles:</b>",
  noStations: "ℹ️ No hi ha estacions disponibles.",
  disambiguation: (field, names) => {
    const label = field === "origin" ? "origen" : "destí";
    return `🔍 Diverses estacions trobades com a ${label}: ${names}\n\n¿Quina volies dir?`;
  },
  errNotFound: (name) => `❌ Estació no trobada: ${name}`,
  errNoConn: (o, d) => `❌ No hi ha connexió entre ${o} i ${d}`,
  errNoService: "❌ No hi ha servei actiu en aquest moment",
  errUnknown: "❌ Error inesperat. Torna-ho a intentar més tard.",
  langChanged: "Idioma canviat a Valencià 🌸",
  langUnknown: "Idioma no reconegut. Usa /idioma es o /idioma val",
  errInvalidData: "Dades invàlides",
  errStillAmbiguous: "Encara hi ha ambigüitat",
};

export const translations: Record<Lang, Translations> = { es, val };
