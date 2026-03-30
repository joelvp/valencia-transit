#!/usr/bin/env bun
/**
 * Local test script for ListLines use case.
 *
 * Usage:
 *   bun run scripts/test-stations.ts
 */

import "@/config/logger";
import { createContainer } from "@/adapters/container";
import { ListLines } from "@/core/application/query/ListLines";
import { lineNumberToEmoji } from "@/adapters/in/telegram/lineEmoji";
import { createLogger } from "@/config/logger";

const log = createLogger("test-stations");

const container = createContainer();

const useCase = new ListLines(
  container.lineRepository,
  container.stationRepository,
  container.eventBus,
);
const result = await useCase.execute();

log.info(`\n🚉 Líneas disponibles:\n`);
for (const { line, terminalFrom, terminalTo } of result) {
  const emoji = lineNumberToEmoji(line.id.value);
  log.info(`${emoji} L${line.id.value}: ${terminalFrom} → ${terminalTo}`);
}

await container.dispose();
