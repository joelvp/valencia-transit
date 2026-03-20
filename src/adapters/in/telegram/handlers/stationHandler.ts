import type { Context } from "grammy";
import type { ListAllStations } from "@/core/application/query/ListAllStations";
import type { Station } from "@/core/domain/station/Station";

export function stationHandler(useCase: ListAllStations) {
  return async (ctx: Context): Promise<void> => {
    const stations = await useCase.execute();
    await ctx.reply(formatStations(stations));
  };
}

function formatStations(stations: Station[]): string {
  if (stations.length === 0) {
    return "ℹ️ No stations available.";
  }

  const lines = stations.map((s) => s.name.value);
  return ["🚉 Available stations:", "", ...lines].join("\n");
}
