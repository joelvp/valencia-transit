type RouteRow = {
  id: string;
  feedId: string;
  transportType: string;
};

export class RouteMother {
  static row(overrides: Partial<RouteRow> = {}): RouteRow {
    return {
      id: "R1",
      feedId: "metrovalencia",
      transportType: "metro",
      ...overrides,
    };
  }
}
