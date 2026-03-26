import { describe, it, expect } from "bun:test";
import { LineColor } from "./LineColor";

describe("LineColor", () => {
  describe("valid values", () => {
    it("should accept an uppercase hex string", () => {
      const color = new LineColor("FFA500");
      expect(color.value).toBe("FFA500");
    });

    it("should accept all zeros", () => {
      const color = new LineColor("000000");
      expect(color.value).toBe("000000");
    });

    it("should normalize lowercase to uppercase", () => {
      const color = new LineColor("ffffff");
      expect(color.value).toBe("FFFFFF");
    });

    it("should normalize mixed case to uppercase", () => {
      const color = new LineColor("fFa500");
      expect(color.value).toBe("FFA500");
    });
  });

  describe("invalid values", () => {
    it("should throw for empty string", () => {
      expect(() => new LineColor("")).toThrow();
    });

    it("should throw for 5-character string", () => {
      expect(() => new LineColor("FFA50")).toThrow();
    });

    it("should throw for 7-character string", () => {
      expect(() => new LineColor("FFA5000")).toThrow();
    });

    it("should throw for non-hex characters", () => {
      expect(() => new LineColor("GGGGGG")).toThrow();
    });

    it("should throw when prefixed with #", () => {
      expect(() => new LineColor("#FFA500")).toThrow();
    });
  });

  describe("equals", () => {
    it("should be equal to another LineColor with the same value", () => {
      expect(new LineColor("FFA500").equals(new LineColor("FFA500"))).toBe(true);
    });

    it("should be equal regardless of input case after normalization", () => {
      expect(new LineColor("ffa500").equals(new LineColor("FFA500"))).toBe(true);
    });

    it("should not be equal to a different color", () => {
      expect(new LineColor("FFA500").equals(new LineColor("000000"))).toBe(false);
    });
  });
});
