import type { Station } from "@/core/domain/station/Station";
import type { Route } from "@/core/domain/route/Route";
import type { Schedule } from "@/core/domain/schedule/Schedule";
import type { Trip } from "@/core/domain/trip/Trip";

export type GtfsData = {
  stations: Station[];
  routes: Route[];
  schedules: Schedule[];
  trips: Trip[];
};
