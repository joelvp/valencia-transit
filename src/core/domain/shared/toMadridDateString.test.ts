import { describe, it, expect } from "bun:test";
import { toMadridDateString } from "./toMadridDateString";

describe("toMadridDateString", () => {
  it("matches the UTC date when Madrid and UTC agree (daytime)", () => {
    // 2026-05-09 12:00 UTC = 2026-05-09 14:00 Madrid (CEST, UTC+2) — same calendar day
    expect(toMadridDateString(new Date("2026-05-09T12:00:00Z"))).toBe("2026-05-09");
  });

  it("is one day ahead of the UTC date right after Madrid midnight (CEST)", () => {
    // 2026-05-09 22:00 UTC = 2026-05-10 00:00 Madrid — UTC still says the 9th
    expect(toMadridDateString(new Date("2026-05-09T22:00:00Z"))).toBe("2026-05-10");
  });

  it("agrees with the UTC date again once UTC itself reaches midnight", () => {
    // 2026-05-10 00:00 UTC = 2026-05-10 02:00 Madrid — both say the 10th
    expect(toMadridDateString(new Date("2026-05-10T00:00:00Z"))).toBe("2026-05-10");
  });

  it("is one day ahead of the UTC date right after Madrid midnight (CET, winter)", () => {
    // 2026-01-09 23:30 UTC = 2026-01-10 00:30 Madrid (CET, UTC+1)
    expect(toMadridDateString(new Date("2026-01-09T23:30:00Z"))).toBe("2026-01-10");
  });
});
