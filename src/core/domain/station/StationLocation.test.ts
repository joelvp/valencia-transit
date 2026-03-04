import { describe, it, expect } from "bun:test";
import { StationLocation } from "./StationLocation.ts";
import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

describe("StationLocation", () => {
  it("should create a valid location", () => {
    const location = new StationLocation(39.4699, -0.3763);
    expect(location.latitude).toBe(39.4699);
    expect(location.longitude).toBe(-0.3763);
  });

  it("should accept exact boundary values", () => {
    expect(() => new StationLocation(90, 180)).not.toThrow();
    expect(() => new StationLocation(-90, -180)).not.toThrow();
    expect(() => new StationLocation(0, 0)).not.toThrow();
  });

  it("should reject latitude out of range", () => {
    expect(() => new StationLocation(91, 0)).toThrow(InvalidArgumentError);
    expect(() => new StationLocation(-91, 0)).toThrow(InvalidArgumentError);
  });

  it("should reject longitude out of range", () => {
    expect(() => new StationLocation(0, 181)).toThrow(InvalidArgumentError);
    expect(() => new StationLocation(0, -181)).toThrow(InvalidArgumentError);
  });

  it("should be equal when coordinates match", () => {
    const a = new StationLocation(39.4699, -0.3763);
    const b = new StationLocation(39.4699, -0.3763);
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when coordinates differ", () => {
    const a = new StationLocation(39.4699, -0.3763);
    const b = new StationLocation(39.47, -0.3763);
    expect(a.equals(b)).toBe(false);
  });
});
