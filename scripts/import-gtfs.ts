import { createContainer } from "@/adapters/container";
import { GtfsParser } from "@/adapters/out/transit-data/GtfsParser";
import { ImportTransitData } from "@/core/application/import/ImportTransitData";

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
    console.error("Error: No GTFS ZIP file path provided.");
    console.error("Usage: bun run scripts/import-gtfs.ts <path-to-gtfs-zip>");
    console.error("Example: bun run scripts/import-gtfs.ts ./data/gtfs/metrovalencia.zip");
    process.exit(1);
  }

  const zipPath = args[0]!;
  const feedId = deriveFeedId(zipPath);

  console.log(`Importing GTFS data from: ${zipPath}`);
  console.log(`Feed ID: ${feedId}`);
  console.log("");

  const container = createContainer();

  try {
    // Parse GTFS ZIP
    console.log("Parsing GTFS file...");
    const parser = new GtfsParser();
    const gtfsData = parser.parse(zipPath);
    console.log(`  - Stations: ${gtfsData.stations.length}`);
    console.log(`  - Lines: ${gtfsData.lines.length}`);
    console.log(`  - Schedules: ${gtfsData.schedules.length}`);
    console.log(`  - Trips: ${gtfsData.trips.length}`);
    console.log("");

    // Execute import
    console.log("Importing data into database...");
    const importUseCase = new ImportTransitData(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.eventBus,
    );

    const summary = await importUseCase.execute(gtfsData, feedId);

    // Log summary
    console.log("");
    console.log("=== Import Summary ===");
    console.log(`Feed ID: ${summary.feedId}`);
    console.log(`Stations imported: ${summary.stationsImported}`);
    console.log(`Lines imported: ${summary.linesImported}`);
    console.log(`Schedules imported: ${summary.schedulesImported}`);
    console.log(`Trips imported: ${summary.tripsImported}`);
    console.log("");
    console.log("Import completed successfully!");
  } catch (error) {
    console.error("");
    console.error("=== Import Failed ===");

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);

      // Provide helpful hints for common errors
      if (error.message.includes("ENOENT") || error.message.includes("no such file")) {
        console.error("");
        console.error("Hint: Make sure the file path is correct and the file exists.");
      } else if (error.message.includes("Missing required GTFS file")) {
        console.error("");
        console.error(
          "Hint: The GTFS ZIP file is missing required files (stops.txt, routes.txt, etc.).",
        );
      }
    } else {
      console.error("An unknown error occurred.");
    }

    process.exit(1);
  } finally {
    await container.dispose();
  }
}

main();
