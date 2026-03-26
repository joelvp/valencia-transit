export type Lang = "es" | "val";

export interface Translations {
  // Usage / help
  usage: string;
  helpText: string;
  // Departures
  nextDepartures: string;
  disclaimer: string;
  noMoreToday: (origin: string, dest: string) => string;
  firstTomorrow: (time: string) => string;
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
  langPickerText: string;
  langChanged: string;
  langUnknown: string;
  // Callback errors
  errInvalidData: string;
  errStillAmbiguous: string;
  // Lines
  linesTitle: string;
  lineStationsTitle: (lineName: string, from: string, to: string) => string;
  errLineNotFound: string;
  // Conversational flow
  askOrigin: string;
  askDestination: string;
  whichStation: string;
  stationNotFoundInFlow: (name: string) => string;
  cancelledSearch: string;
  cancelHint: string;
  // Rate limiting
  rateLimitExceeded: string;
  // Command menu descriptions
  cmdSalida: string;
  cmdLineas: string;
  cmdIdioma: string;
  cmdHelp: string;
  cmdCancelar: string;
}

const es: Translations = {
  usage: "⚠️ Uso: /salida &lt;origen&gt; - &lt;destino&gt;",
  helpText: [
    "🤖 <b>Valencia Transit Bot</b>",
    "",
    "Comandos disponibles:",
    "/salida, /s &lt;origen&gt; - &lt;destino&gt; — Próximas salidas entre dos estaciones",
    "/lineas — Ver líneas y paradas",
    "/idioma es | val — Cambiar idioma",
    "/help — Mostrar esta ayuda",
  ].join("\n"),
  nextDepartures: "Próximas salidas:",
  disclaimer: "ℹ️ Horarios planificados. Los tiempos reales pueden variar.",
  noMoreToday: (o, d) => `No hay más salidas hoy de ${o} a ${d}.`,
  firstTomorrow: (time) => `🌅 Primera salida mañana: <b>${time}</b>`,
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
  langPickerText: "🌐 ¿A qué idioma quieres cambiar?",
  langChanged: "Idioma cambiado a Español 🇪🇸",
  langUnknown: "Idioma no reconocido. Usa /idioma es o /idioma val",
  errInvalidData: "Datos inválidos",
  errStillAmbiguous: "Aún hay ambigüedad",
  linesTitle: "Selecciona una línea:",
  lineStationsTitle: (lineName, from, to) => `Paradas de L${lineName}: ${from} → ${to}`,
  errLineNotFound: "Línea no encontrada",
  askOrigin: "🚊 ¿Desde dónde quieres salir?",
  askDestination: "🚊 ¿Hasta dónde?",
  stationNotFoundInFlow: (name) =>
    `❌ No conozco ninguna estación llamada "${name}". Inténtalo de nuevo o escribe /cancelar para salir.`,
  whichStation: "🔍 ¿Cuál querías decir?",
  cancelledSearch: "🚫 Búsqueda cancelada.",
  cancelHint: "(Escribe /cancelar para salir en cualquier momento)",
  rateLimitExceeded: "⏳ Demasiados mensajes. Espera un momento.",
  cmdSalida: "Próximas salidas entre dos estaciones",
  cmdLineas: "Ver líneas disponibles",
  cmdIdioma: "Cambiar idioma",
  cmdHelp: "Ayuda",
  cmdCancelar: "Cancelar búsqueda en curso",
};

const val: Translations = {
  usage: "⚠️ Ús: /eixida &lt;origen&gt; - &lt;destí&gt;",
  helpText: [
    "🤖 <b>Valencia Transit Bot</b>",
    "",
    "Ordres disponibles:",
    "/eixida, /e &lt;origen&gt; - &lt;destí&gt; — Pròximes eixides entre dos estacions",
    "/linies — Veure línies i parades",
    "/idioma es | val — Canviar idioma",
    "/help — Mostrar aquesta ajuda",
  ].join("\n"),
  nextDepartures: "Pròximes eixides:",
  disclaimer: "ℹ️ Horaris planificats. Els temps reals poden variar.",
  noMoreToday: (o, d) => `No hi ha més eixides hui de ${o} a ${d}.`,
  firstTomorrow: (time) => `🌅 Primera eixida demà: <b>${time}</b>`,
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
  langPickerText: "🌐 A quin idioma vols canviar?",
  langChanged: "Idioma canviat a Valencià 🍊",
  langUnknown: "Idioma no reconegut. Usa /idioma es o /idioma val",
  errInvalidData: "Dades invàlides",
  errStillAmbiguous: "Encara hi ha ambigüitat",
  linesTitle: "Selecciona una línia:",
  lineStationsTitle: (lineName, from, to) => `Parades de L${lineName}: ${from} → ${to}`,
  errLineNotFound: "Línia no trobada",
  askOrigin: "🚊 Des d'on vols eixir?",
  askDestination: "🚊 Fins on?",
  stationNotFoundInFlow: (name) =>
    `❌ No conec cap estació amb el nom "${name}". Torna-ho a intentar o escriu /cancelar per a eixir.`,
  whichStation: "🔍 Quina volies dir?",
  cancelledSearch: "🚫 Cerca cancel·lada.",
  cancelHint: "(Escriu /cancelar per a eixir en qualsevol moment)",
  rateLimitExceeded: "⏳ Massa missatges. Espera un moment.",
  cmdSalida: "Pròximes eixides entre dos estacions",
  cmdLineas: "Veure línies disponibles",
  cmdIdioma: "Canviar idioma",
  cmdHelp: "Ajuda i informació",
  cmdCancelar: "Cancel·lar cerca en curs",
};

export const translations: Record<Lang, Translations> = { es, val };
