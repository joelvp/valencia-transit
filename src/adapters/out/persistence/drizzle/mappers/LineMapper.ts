import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineDirection } from "@/core/domain/line/LineDirection";
import { LineStop } from "@/core/domain/line/LineStop";
import { StationId } from "@/core/domain/station/StationId";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

type LineRow = {
  id: string;
  name: string;
};

type LineStationRow = {
  stationId: string;
  sequence: number;
  direction: string;
};

type LineInsert = {
  id: string;
  feedId: string;
  name: string;
  shortName: string | null;
  transportType: string;
};

type LineStationInsert = {
  lineId: string;
  stationId: string;
  feedId: string;
  sequence: number;
  direction: string;
};

type LinePersistenceResult = {
  line: LineInsert;
  lineStations: LineStationInsert[];
};

function parseDirection(raw: string): LineDirection {
  if (raw === LineDirection.OUTBOUND) return LineDirection.OUTBOUND;
  if (raw === LineDirection.INBOUND) return LineDirection.INBOUND;
  throw new InvalidArgumentError(`Unknown LineDirection: "${raw}"`);
}

export const LineMapper = {
  toDomain(row: LineRow, lineStationRows: LineStationRow[]): Line {
    const direction = lineStationRows.length > 0 ? parseDirection(lineStationRows[0]!.direction) : LineDirection.OUTBOUND;

    const stops = lineStationRows.map(
      (ls) => new LineStop(new StationId(ls.stationId), ls.sequence),
    );

    return new Line(new LineId(row.id), new LineName(row.name), direction, stops);
  },

  toPersistence(line: Line, feedId: string): LinePersistenceResult {
    const lineInsert: LineInsert = {
      id: line.id.value,
      feedId,
      name: line.name.value,
      shortName: null,
      transportType: "metro",
    };

    const lineStations: LineStationInsert[] = line.stops.map((stop) => ({
      lineId: line.id.value,
      stationId: stop.stationId.value,
      feedId,
      sequence: stop.sequence,
      direction: line.direction,
    }));

    return { line: lineInsert, lineStations };
  },
};
