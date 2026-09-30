#!/usr/bin/env bun
/**
 * Syncs FGV's station ids into `fgv_station_ids`, matching by normalized name + coordinate
 * proximity. Usage: bun run scripts/sync-fgv-station-ids.ts [feedId]
 */

import "@/config/logger";
import { createContainer } from "@/adapters/container";
import {
  FgvStationIdRepositoryDrizzle,
  type FgvStationIdMapping,
} from "@/adapters/out/persistence/drizzle/repositories/FgvStationIdRepositoryDrizzle";
import {
  FGV_BASE_URL,
  FGV_USER_AGENT,
} from "@/adapters/out/live-departures/provider-fgv/LiveDepartureProviderFgv";
import type { Station } from "@/core/domain/station/Station";
import { createLogger } from "@/config/logger";

const log = createLogger("sync-fgv-station-ids");

const FGV_ESTACIONES_URL = `${FGV_BASE_URL}/estaciones`;

// Confidently-matched pairs (same normalized name) sit a few meters apart in practice — this only
// guards against a coincidental name collision pointing at the wrong physical station.
const MAX_MATCH_DISTANCE_METERS = 500;

interface FgvStation {
  estacion_id_FGV: number;
  nombre: string;
  latitud: number;
  longitud: number;
}

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ·'.]/g, "")
    .toLowerCase()
    .trim();
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const EARTH_RADIUS_METERS = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

async function fetchFgvStations(): Promise<FgvStation[]> {
  const response = await fetch(FGV_ESTACIONES_URL, {
    headers: { Accept: "application/json", "User-Agent": FGV_USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`FGV /estaciones request failed with status ${response.status}`);
  }
  return (await response.json()) as FgvStation[];
}

function matchStations(
  ourStations: Station[],
  fgvStations: FgvStation[],
): { mappings: FgvStationIdMapping[]; unmatched: string[]; lowConfidence: string[] } {
  const byNormalizedName = new Map<string, Station[]>();
  for (const station of ourStations) {
    const key = normalize(station.name.value);
    const bucket = byNormalizedName.get(key) ?? [];
    bucket.push(station);
    byNormalizedName.set(key, bucket);
  }

  const mappings: FgvStationIdMapping[] = [];
  const unmatched: string[] = [];
  const lowConfidence: string[] = [];

  for (const fgv of fgvStations) {
    const candidates = byNormalizedName.get(normalize(fgv.nombre)) ?? [];

    if (candidates.length === 0) {
      unmatched.push(fgv.nombre);
      continue;
    }

    const closest = candidates.reduce(
      (best, candidate) => {
        const distance = haversineMeters(
          fgv.latitud,
          fgv.longitud,
          candidate.location.latitude,
          candidate.location.longitude,
        );
        return distance < best.distance ? { candidate, distance } : best;
      },
      { candidate: candidates[0]!, distance: Infinity },
    );

    if (closest.distance > MAX_MATCH_DISTANCE_METERS) {
      lowConfidence.push(
        `${fgv.nombre} (fgv_id=${fgv.estacion_id_FGV}) — closest name match "${closest.candidate.name.value}" is ${closest.distance.toFixed(0)}m away`,
      );
      continue;
    }

    mappings.push({ stationId: closest.candidate.id, fgvStationId: fgv.estacion_id_FGV });
  }

  return { mappings, unmatched, lowConfidence };
}

async function main() {
  const feedId = process.argv[2] ?? "metrovalencia";
  log.info({ feedId }, "Starting FGV station-id sync");

  const container = createContainer();
  const fgvStationIdRepository = new FgvStationIdRepositoryDrizzle(container.db);

  try {
    const [ourStations, fgvStations] = await Promise.all([
      container.stationRepository.findAll(),
      fetchFgvStations(),
    ]);
    log.info(
      { ourStations: ourStations.length, fgvStations: fgvStations.length },
      "Fetched both station catalogues",
    );

    const { mappings, unmatched, lowConfidence } = matchStations(ourStations, fgvStations);

    if (unmatched.length > 0) {
      log.warn(
        { count: unmatched.length, stations: unmatched },
        "FGV stations with no name match in our catalogue — not mapped",
      );
    }
    if (lowConfidence.length > 0) {
      log.warn(
        { count: lowConfidence.length, stations: lowConfidence },
        "Name matched but coordinates too far apart — not mapped, needs manual review",
      );
    }

    // Atomic: if the insert fails, the previous mapping stays in place.
    await container.transactionManager.run(() => fgvStationIdRepository.saveAll(mappings, feedId));

    log.info(
      { mapped: mappings.length, unmatched: unmatched.length, lowConfidence: lowConfidence.length },
      "FGV station-id sync completed",
    );
  } catch (error) {
    log.error({ err: error }, "FGV station-id sync failed");
    process.exit(1);
  } finally {
    await container.dispose();
  }
}

main();
