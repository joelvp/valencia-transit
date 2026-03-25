#!/usr/bin/env bun
/**
 * Local test script for ListLines use case.
 *
 * Usage:
 *   bun run scripts/test-stations.ts
 */

import { createContainer } from "@/adapters/container";
import { ListLines } from "@/core/application/query/ListLines";
import { lineNumberToEmoji } from "@/adapters/in/telegram/lineEmoji";

const container = createContainer();

const useCase = new ListLines(container.lineRepository, container.stationRepository);
const result = await useCase.execute();

console.log("\n🚉 Líneas disponibles:\n");
for (const { line, terminalFrom, terminalTo } of result) {
  const emoji = lineNumberToEmoji(line.id.value);
  console.log(`${emoji} L${line.id.value}: ${terminalFrom} → ${terminalTo}`);
}

await container.dispose();
