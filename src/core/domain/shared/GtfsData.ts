import type { Station } from "../station/Station.ts";
import type { Route } from "../route/Route.ts";
import type { Schedule } from "../schedule/Schedule.ts";
import type { Trip } from "../trip/Trip.ts";

export type GtfsData = {
  stations: Station[];
  routes: Route[];
  schedules: Schedule[];
  trips: Trip[];
};
