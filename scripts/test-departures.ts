#!/usr/bin/env bun
/**
 * Local test script for SearchNextDepartures use case.
 *
 * Usage:
 *   bun run scripts/test-departures.ts "Xàtiva" "Colón"
 *   bun run scripts/test-departures.ts "Xàtiva" "Colón" 08:30
 *   bun run scripts/test-departures.ts "Xàtiva" "Colón" 2026-03-19
 *   bun run scripts/test-departures.ts "Xàtiva" "Colón" 2026-03-19 00:30
 *
 * Date/time (either, both, or neither) default to "now" — always resolved
 * in the configured timezone (ServiceCalendar), never the machine's own.
 */

import "@/config/logger";
import { createContainer } from "@/adapters/container";
import type { ServiceCalendar } from "@/core/domain/shared/ServiceCalendar";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { initI18n, getT } from "@/adapters/in/telegram/i18n";
import { formatDepartures, formatNoMoreToday } from "@/adapters/in/telegram/handlers/formatters";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import { createLogger } from "@/config/logger";

const log = createLogger("test-departures");

const [originArg, destinationArg, ...rest] = process.argv.slice(2);

if (!originArg || !destinationArg) {
  log.error(
    "Usage: bun run scripts/test-departures.ts <origin> <destination> [YYYY-MM-DD] [HH:MM]",
  );
  process.exit(1);
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

function parseDateTimeArgs(args: string[]): { dateArg?: string; timeArg?: string } {
  let dateArg: string | undefined;
  let timeArg: string | undefined;
  for (const arg of args) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      dateArg = arg;
    } else if (/^\d{1,2}:\d{2}$/.test(arg)) {
      timeArg = arg;
    } else {
      log.error({ arg }, "Unrecognized argument. Expected YYYY-MM-DD and/or HH:MM");
      process.exit(1);
    }
  }
  return { dateArg, timeArg };
}

// Builds the requested civil date+time via ServiceCalendar — never the machine's own timezone.
function resolveNow(calendar: ServiceCalendar, dateArg?: string, timeArg?: string): Date {
  const nowReal = new Date();
  const dateStr = dateArg ?? calendar.serviceDateOf(nowReal).value;
  const timeStr = timeArg ? `${timeArg}:00` : calendar.timeOfDayOf(nowReal).value;
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  const guessedAsZoned = new Date(
    `${calendar.serviceDateOf(guess).value}T${calendar.timeOfDayOf(guess).value}Z`,
  );
  const offsetMs = guessedAsZoned.getTime() - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

const { dateArg, timeArg } = parseDateTimeArgs(rest);
await initI18n();
const t = getT("es");

const container = createContainer();
const now = resolveNow(container.serviceCalendar, dateArg, timeArg);

const useCase = new SearchNextDepartures(
  container.stationRepository,
  container.lineRepository,
  container.scheduleRepository,
  container.tripRepository,
  container.routeRepository,
  container.eventBus,
  container.serviceCalendar,
);

log.info(
  {
    origin: originArg,
    destination: destinationArg,
    queryDate: container.serviceCalendar.serviceDateOf(now).value,
    queryTime: container.serviceCalendar.timeOfDayOf(now).value,
  },
  "Searching departures",
);

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

  log.info(stripHtml(message));
} catch (err) {
  if (err instanceof StationNotFoundError) {
    const match = /^Station not found: "(.+)"$/.exec((err as Error).message);
    const name = match ? match[1]! : "unknown";
    log.error({ stationName: name }, "Estación no encontrada");
  } else if (err instanceof NoConnectionError) {
    log.error(
      { origin: originArg, destination: destinationArg },
      "No hay conexión entre estaciones",
    );
  } else if (err instanceof NoActiveServiceError) {
    log.error("No hay servicio activo en este momento");
  } else {
    log.error({ err }, "Error inesperado");
  }
} finally {
  // SearchNextDepartures publishes analytics fire-and-forget (by design — see
  // design-principles.md #8); give that in-flight write a moment to finish
  // before closing the pool, or it fails with CONNECTION_ENDED.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await container.dispose();
}
