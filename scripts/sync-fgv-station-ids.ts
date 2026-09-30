#!/usr/bin/env bun
/** Syncs FGV's station ids into `fgv_station_ids`. Usage: bun run scripts/sync-fgv-station-ids.ts */

import "@/config/logger";
import { createContainer } from "@/adapters/container";
import { SyncLiveStationMapping } from "@/core/application/import/SyncLiveStationMapping";
import { createLogger } from "@/config/logger";

const log = createLogger("sync-fgv-station-ids");

async function main() {
  log.info("Starting FGV station-id sync");
  const container = createContainer();
  const syncMapping = new SyncLiveStationMapping(
    container.stationRepository,
    container.liveStationMapping,
  );

  try {
    const report = await syncMapping.execute();

    if (report.hasIssues) {
      log.warn(
        { unmatched: report.unmatched, lowConfidence: report.lowConfidence },
        "FGV sync finished with unmapped stations, needs manual review",
      );
    }
    log.info(
      {
        mapped: report.mappedCount,
        unmatched: report.unmatched.length,
        lowConfidence: report.lowConfidence.length,
      },
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
