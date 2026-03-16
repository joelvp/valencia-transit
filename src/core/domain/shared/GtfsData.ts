import type { Station } from "../station/Station.ts";
import type { Line } from "../line/Line.ts";
import type { Schedule } from "../schedule/Schedule.ts";
import type { Trip } from "../trip/Trip.ts";

export interface GtfsData {
  stations: Station[];
  lines: Line[];
  schedules: Schedule[];
  trips: Trip[];
}
