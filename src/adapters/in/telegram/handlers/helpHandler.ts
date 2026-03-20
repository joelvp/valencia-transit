import type { Context } from "grammy";

const HELP_TEXT = [
  "🤖 <b>Valencia Transit Bot</b>",
  "",
  "Comandos disponibles:",
  "/salida &lt;origen&gt; - &lt;destino&gt; — Próximas salidas entre dos estaciones",
  "/s &lt;origen&gt; - &lt;destino&gt; — Atajo para /salida",
  "/paradas — Listar estaciones",
  "/help — Mostrar esta ayuda",
].join("\n");

export function helpHandler() {
  return async (ctx: Context): Promise<void> => {
    await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
  };
}
