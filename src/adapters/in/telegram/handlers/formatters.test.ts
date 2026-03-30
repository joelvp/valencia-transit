import { describe, it, expect, beforeAll } from "bun:test";
import { formatDepartures, formatNoMoreToday } from "./formatters";
import { initI18n, getT } from "@/adapters/in/telegram/i18n";
import { Departure } from "@/core/domain/shared/Departure";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

beforeAll(async () => {
  await initI18n();
});

// Helper: build a Departure where minutesRemaining = stated value by setting currentTime
// to departureTime - wait. For most tests we only care about the departure time displayed,
// so we can just set currentTime = departureTime (0 min remaining) unless we need the wait text.
function dep(
  departureHHMMSS: string,
  lineName: string | null = null,
  headsign: string | null = null,
  lineColor: string | null = null,
  durationMinutes: number | null = null,
  currentHHMMSS = "14:00:00",
): Departure {
  return new Departure(
    new TimeOfDay(departureHHMMSS),
    lineName,
    headsign,
    new TimeOfDay(currentHHMMSS),
    lineColor,
    durationMinutes,
  );
}

describe("formatDepartures", () => {
  it("should include origin and destination in the header", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00", "3")]);
    expect(result).toContain("Xàtiva");
    expect(result).toContain("Colón");
  });

  it("should format departure time with leading zeros", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("09:05:00", "3")]);
    expect(result).toContain("<b>09:05</b>");
  });

  it("should include wait in minutes when under 60", () => {
    const t = getT("es");
    // departure at 14:45, current at 14:00 → 45 min remaining
    const result = formatDepartures(t, "Xàtiva", "Colón", [
      dep("14:45:00", "3", null, null, null, "14:00:00"),
    ]);
    expect(result).toContain("(45 min)");
  });

  it("should include duration suffix when durationMinutes is set", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00", "3", null, null, 12)]);
    expect(result).toContain("(~12 min)");
  });

  it("should not include duration suffix when durationMinutes is null", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00", "3", null, null, null)]);
    expect(result).not.toContain("~");
  });

  it("should include headsign when present", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00", "3", "Rafelbunyol")]);
    expect(result).toContain("Rafelbunyol");
  });

  it("should include line name when present", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00", "3")]);
    expect(result).toContain("L3");
  });

  it("should include firstTomorrow time when provided", () => {
    const t = getT("es");
    const tomorrow = dep("06:00:00");
    const result = formatDepartures(
      t,
      "Xàtiva",
      "Colón",
      [dep("22:00:00", null, null, null, null, "22:00:00")],
      tomorrow,
    );
    expect(result).toContain("06:00");
  });

  it("should not include firstTomorrow section when null", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00")], null);
    expect(result).not.toContain("Primera salida mañana");
  });

  it("should include multiple departures", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [
      dep("14:30:00", "3"),
      dep("14:45:00", "5"),
    ]);
    expect(result).toContain("<b>14:30</b>");
    expect(result).toContain("<b>14:45</b>");
  });

  it("should include the next departures label", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00")]);
    expect(result).toContain("Próximas salidas:");
  });

  it("should include the disclaimer line", () => {
    const t = getT("es");
    const result = formatDepartures(t, "Xàtiva", "Colón", [dep("14:30:00")]);
    expect(result).toContain("Horarios planificados");
  });
});

describe("formatNoMoreToday", () => {
  it("should include origin and destination in the header", () => {
    const t = getT("es");
    const result = formatNoMoreToday(t, "Xàtiva", "Colón", null);
    expect(result).toContain("Xàtiva");
    expect(result).toContain("Colón");
  });

  it("should include no more today message with origin and destination", () => {
    const t = getT("es");
    const result = formatNoMoreToday(t, "Xàtiva", "Colón", null);
    expect(result).toContain("No hay más salidas hoy");
    expect(result).toContain("Xàtiva");
    expect(result).toContain("Colón");
  });

  it("should include firstTomorrow time when provided", () => {
    const t = getT("es");
    const tomorrow = dep("05:42:00");
    const result = formatNoMoreToday(t, "Xàtiva", "Colón", tomorrow);
    expect(result).toContain("05:42");
    expect(result).toContain("Primera salida mañana");
  });

  it("should not include firstTomorrow section when null", () => {
    const t = getT("es");
    const result = formatNoMoreToday(t, "Xàtiva", "Colón", null);
    expect(result).not.toContain("Primera salida mañana");
  });

  it("should include line emoji in header", () => {
    const t = getT("es");
    const result = formatNoMoreToday(t, "Xàtiva", "Colón", null, "3");
    expect(result).toContain("🚇");
  });
});

describe("formatWait (via formatDepartures)", () => {
  it("should format wait under 60 min as 'N min'", () => {
    const t = getT("es");
    // departure at 10:30, current at 10:00 → 30 min remaining
    const result = formatDepartures(t, "A", "B", [
      dep("10:30:00", null, null, null, null, "10:00:00"),
    ]);
    expect(result).toContain("(30 min)");
  });

  it("should format wait of exactly 60 min as '1h'", () => {
    const t = getT("es");
    // departure at 11:00, current at 10:00 → 60 min remaining
    const result = formatDepartures(t, "A", "B", [
      dep("11:00:00", null, null, null, null, "10:00:00"),
    ]);
    expect(result).toContain("(1h)");
  });

  it("should format wait of 90 min as '1h 30min'", () => {
    const t = getT("es");
    // departure at 11:30, current at 10:00 → 90 min remaining
    const result = formatDepartures(t, "A", "B", [
      dep("11:30:00", null, null, null, null, "10:00:00"),
    ]);
    expect(result).toContain("(1h 30min)");
  });

  it("should format wait of 120 min as '2h'", () => {
    const t = getT("es");
    // departure at 12:00, current at 10:00 → 120 min remaining
    const result = formatDepartures(t, "A", "B", [
      dep("12:00:00", null, null, null, null, "10:00:00"),
    ]);
    expect(result).toContain("(2h)");
  });

  it("should format wait of 0 min as '0 min'", () => {
    const t = getT("es");
    // departure at 10:00, current at 10:00 → 0 min remaining
    const result = formatDepartures(t, "A", "B", [
      dep("10:00:00", null, null, null, null, "10:00:00"),
    ]);
    expect(result).toContain("(0 min)");
  });
});

describe("formatTime (via formatDepartures)", () => {
  it("should pad hours and minutes with leading zeros", () => {
    const t = getT("es");
    const result = formatDepartures(t, "A", "B", [dep("03:07:00")]);
    expect(result).toContain("<b>03:07</b>");
  });

  it("should wrap midnight-crossing hours (hours >= 24) with modulo", () => {
    const t = getT("es");
    // TimeOfDay allows hours >= 24 for GTFS overnight trips
    const departure = new Departure(
      new TimeOfDay("25:10:00"),
      null,
      null,
      new TimeOfDay("25:00:00"),
    );
    const result = formatDepartures(t, "A", "B", [departure]);
    expect(result).toContain("<b>01:10</b>");
  });

  it("should format exactly midnight as 00:00", () => {
    const t = getT("es");
    const result = formatDepartures(t, "A", "B", [dep("00:00:00")]);
    expect(result).toContain("<b>00:00</b>");
  });
});
