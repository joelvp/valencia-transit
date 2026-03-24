import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import type { LineStop } from "@/core/domain/line/LineStop";

type LineRow = {
  id: string;
  feedId: string;
  name: string;
  transportType: string;
  color?: string | null;
};

type LineStopRow = {
  lineId: string;
  stationId: string;
  feedId: string;
  sequence: number;
};

export class LineMother {
  static create(overrides: Partial<{ id: string; name: string; stops: LineStop[] }> = {}): Line {
    return new Line(
      new LineId(overrides.id ?? "L1"),
      new LineName(overrides.name ?? "Línia 1"),
      overrides.stops ?? [],
    );
  }

  static row(overrides: Partial<LineRow> = {}): LineRow {
    return {
      id: "L1",
      feedId: "metrovalencia",
      name: "Línia 1",
      transportType: "metro",
      ...overrides,
    };
  }

  static stopRow(overrides: Partial<LineStopRow> = {}): LineStopRow {
    return {
      lineId: "L1",
      stationId: "ST1",
      feedId: "metrovalencia",
      sequence: 1,
      ...overrides,
    };
  }
}
