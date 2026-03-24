import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineColor } from "@/core/domain/line/LineColor";
import { LineStop } from "@/core/domain/line/LineStop";
import { StationId } from "@/core/domain/station/StationId";

type LineRow = {
  id: string;
  name: string;
  color: string | null;
};

type LineStationRow = {
  stationId: string;
  sequence: number;
};

type LineInsert = {
  id: string;
  feedId: string;
  name: string;
  transportType: string;
  color: string | null;
};

type LineStationInsert = {
  lineId: string;
  stationId: string;
  feedId: string;
  sequence: number;
};

type LinePersistenceResult = {
  line: LineInsert;
  lineStations: LineStationInsert[];
};

export const LineMapper = {
  toDomain(row: LineRow, lineStationRows: LineStationRow[]): Line {
    const stops = lineStationRows.map(
      (ls) => new LineStop(new StationId(ls.stationId), ls.sequence),
    );

    const color = row.color ? new LineColor(row.color) : null;
    return new Line(new LineId(row.id), new LineName(row.name), stops, color);
  },

  toPersistence(line: Line, feedId: string): LinePersistenceResult {
    const lineInsert: LineInsert = {
      id: line.id.value,
      feedId,
      name: line.name.value,
      transportType: "metro",
      color: line.color?.value ?? null,
    };

    const lineStations: LineStationInsert[] = line.stops.map((stop) => ({
      lineId: line.id.value,
      stationId: stop.stationId.value,
      feedId,
      sequence: stop.sequence,
    }));

    return { line: lineInsert, lineStations };
  },
};
