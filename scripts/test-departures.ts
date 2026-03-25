#!/usr/bin/env bun
/**
 * Local test script for SearchNextDepartures use case.
 *
 * Usage:
 *   bun run scripts/test-departures.ts "Xàtiva" "Colón"
 *   bun run scripts/test-departures.ts "Xàtiva" "Colón" 08:30
 */

import { createContainer } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { translations } from "@/adapters/in/telegram/i18n";
import { formatDepartures, formatNoMoreToday } from "@/adapters/in/telegram/handlers/formatters";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";

const [originArg, destinationArg, timeArg] = process.argv.slice(2);

if (!originArg || !destinationArg) {
  console.error("Usage: bun run scripts/test-departures.ts <origin> <destination> [HH:MM]");
  process.exit(1);
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

function buildNow(timeArg?: string): Date {
  if (!timeArg) return new Date();
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeArg);
  if (!match) {
    console.error(`Invalid time format: "${timeArg}". Expected HH:MM`);
    process.exit(1);
  }
  const now = new Date();
  now.setHours(parseInt(match[1]!, 10), parseInt(match[2]!, 10), 0, 0);
  return now;
}

const now = buildNow(timeArg);
const t = translations.es;

const container = createContainer();

const useCase = new SearchNextDepartures(
  container.stationRepository,
  container.lineRepository,
  container.scheduleRepository,
  container.tripRepository,
  container.routeRepository,
  container.eventBus,
);

console.log(`\nSearching: ${originArg} → ${destinationArg} at ${now.toLocaleTimeString("es-ES")}\n`);

try {
  const result = await useCase.execute(originArg, destinationArg, now);

  let message: string;

  if (result.type === "disambiguation") {
    const label = result.field === "origin" ? "origen" : "destino";
    const names = result.candidates.map((c) => c.name.value).join(", ");
    message = `🔍 Varias estaciones como ${label}: ${names}`;
  } else if (result.type === "no_more_today") {
    message = formatNoMoreToday(
      t,
      result.origin.name.value,
      result.destination.name.value,
      result.firstTomorrow,
      result.routeLineName,
    );
  } else {
    message = formatDepartures(
      t,
      result.data.origin.name.value,
      result.data.destination.name.value,
      result.data.departures,
      result.data.firstTomorrow,
      result.data.routeLineName,
    );
  }

  console.log(stripHtml(message));
} catch (err) {
  if (err instanceof StationNotFoundError) {
    const match = /^Station not found: "(.+)"$/.exec((err as Error).message);
    const name = match ? match[1]! : "unknown";
    console.error(`❌ Estación no encontrada: ${name}`);
  } else if (err instanceof NoConnectionError) {
    console.error(`❌ No hay conexión entre ${originArg} y ${destinationArg}`);
  } else if (err instanceof NoActiveServiceError) {
    console.error("❌ No hay servicio activo en este momento");
  } else {
    console.error("❌ Error inesperado:", err);
  }
} finally {
  await container.dispose();
}
