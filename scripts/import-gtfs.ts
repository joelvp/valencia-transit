import "@/config/logger";
import { createContainer } from "@/adapters/container";
import { GtfsParser } from "@/adapters/out/transit-data/GtfsParser";
import { ImportTransitData } from "@/core/application/import/ImportTransitData";
import { BuildLines } from "@/core/domain/line/BuildLines";
import { createLogger } from "@/config/logger";

const log = createLogger("import-gtfs");

const OPERATOR_ALIASES: Array<{ pattern: RegExp; feedId: string }> = [
  { pattern: /metro.?valencia/i, feedId: "metrovalencia" },
];

function deriveFeedId(filePath: string): string {
  const filename = filePath.split(/[/\\]/).pop() ?? filePath;
  const withoutExt = filename.replace(/\.[^/.]+$/, "");

  for (const { pattern, feedId } of OPERATOR_ALIASES) {
    if (pattern.test(withoutExt)) return feedId;
  }

  return withoutExt;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log.error(
      "No GTFS ZIP file path provided. Usage: bun run scripts/import-gtfs.ts <path-to-gtfs-zip>",
    );
    process.exit(1);
  }

  const zipPath = args[0]!;
  const feedId = deriveFeedId(zipPath);

  log.info({ zipPath, feedId }, "Starting GTFS import");

  const container = createContainer();

  try {
    log.info("Parsing GTFS file...");
    const parser = new GtfsParser();
    const gtfsData = parser.parse(zipPath);
    const lines = BuildLines.fromRoutesAndTrips(gtfsData.routes, gtfsData.trips);
    log.info(
      {
        stations: gtfsData.stations.length,
        routes: gtfsData.routes.length,
        lines: lines.length,
        schedules: gtfsData.schedules.length,
        trips: gtfsData.trips.length,
      },
      "GTFS parsed",
    );

    const importUseCase = new ImportTransitData(
      container.stationRepository,
      container.routeRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.eventBus,
    );

    const summary = await importUseCase.execute(gtfsData, feedId);

    log.info(
      {
        feedId: summary.feedId,
        stationsImported: summary.stationsImported,
        routesImported: summary.routesImported,
        linesImported: summary.linesImported,
        schedulesImported: summary.schedulesImported,
        tripsImported: summary.tripsImported,
      },
      "Import completed successfully",
    );
  } catch (error) {
    if (error instanceof Error) {
      log.error({ err: error }, "Import failed");

      if (error.message.includes("ENOENT") || error.message.includes("no such file")) {
        log.error("Hint: Make sure the file path is correct and the file exists.");
      } else if (error.message.includes("Missing required GTFS file")) {
        log.error(
          "Hint: The GTFS ZIP file is missing required files (stops.txt, routes.txt, etc.).",
        );
      }
    } else {
      log.error({ err: error }, "Import failed with unknown error");
    }

    process.exit(1);
  } finally {
    await container.dispose();
  }
}

main();
