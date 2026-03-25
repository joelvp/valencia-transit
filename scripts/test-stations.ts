#!/usr/bin/env bun
/**
 * Local test script for ListStationsWithLines use case.
 *
 * Usage:
 *   bun run scripts/test-stations.ts
 */

import { createContainer } from "@/adapters/container";
import { ListStationsWithLines } from "@/core/application/query/ListStationsWithLines";
import { lineNumberToEmoji, lineNumberToName } from "@/adapters/in/telegram/lineEmoji";

const container = createContainer();

const useCase = new ListStationsWithLines(container.stationRepository, container.lineRepository);
const result = await useCase.execute();

console.log("\n🚉 Estaciones disponibles:\n");
for (const { station, lines } of result) {
  const lineLabels = lines
    .map((l) => {
      const num = l.id.value;
      return `${lineNumberToEmoji(num)} ${lineNumberToName(num)}`;
    })
    .join(" · ");
  console.log(lineLabels ? `${station.name.value}  ${lineLabels}` : station.name.value);
}

await container.dispose();
