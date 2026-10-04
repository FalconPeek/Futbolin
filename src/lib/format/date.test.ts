import { describe, it, expect } from "vitest";
import {
  formatMatchDate,
  formatShortDate,
  formatTime,
  APP_TIME_ZONE,
} from "./date";

describe("date formatting (es-AR, Buenos Aires)", () => {
  it("should export APP_TIME_ZONE", () => {
    expect(APP_TIME_ZONE).toBe("America/Argentina/Buenos_Aires");
  });

  describe("formatMatchDate", () => {
    it("should format 2026-10-04T00:00:00Z as 'sáb 3 oct · 21:00' in Buenos Aires", () => {
      const result = formatMatchDate("2026-10-04T00:00:00Z");
      expect(result).toBe("sáb 3 oct · 21:00");
    });

    it("should handle month boundary: 2026-11-01T02:30:00Z as 'sáb 31 oct · 23:30'", () => {
      const result = formatMatchDate("2026-11-01T02:30:00Z");
      expect(result).toBe("sáb 31 oct · 23:30");
    });

    it("should accept Date objects", () => {
      const date = new Date("2026-10-04T00:00:00Z");
      const result = formatMatchDate(date);
      expect(result).toBe("sáb 3 oct · 21:00");
    });

    it("should not contain dots in abbreviations", () => {
      const result = formatMatchDate("2026-10-04T00:00:00Z");
      expect(result).not.toMatch(/\./);
    });

    it("should throw Error for invalid date string", () => {
      expect(() => formatMatchDate("invalid-date")).toThrow(Error);
      expect(() => formatMatchDate("invalid-date")).toThrow(
        /Fecha inválida/
      );
    });

    it("should throw Error for invalid Date object", () => {
      const invalidDate = new Date("invalid");
      expect(() => formatMatchDate(invalidDate)).toThrow(Error);
    });
  });

  describe("formatShortDate", () => {
    it("should format as 'day month'", () => {
      const result = formatShortDate("2026-10-04T00:00:00Z");
      expect(result).toBe("3 oct");
    });

    it("should accept Date objects", () => {
      const date = new Date("2026-10-04T00:00:00Z");
      const result = formatShortDate(date);
      expect(result).toBe("3 oct");
    });

    it("should not contain dots", () => {
      const result = formatShortDate("2026-10-04T00:00:00Z");
      expect(result).not.toMatch(/\./);
    });

    it("should throw Error for invalid date", () => {
      expect(() => formatShortDate("invalid")).toThrow(Error);
    });
  });

  describe("formatTime", () => {
    it("should format time as HH:mm in 24h format", () => {
      const result = formatTime("2026-10-04T00:00:00Z");
      expect(result).toBe("21:00");
    });

    it("should handle different times", () => {
      const result = formatTime("2026-11-01T02:30:00Z");
      expect(result).toBe("23:30");
    });

    it("should accept Date objects", () => {
      const date = new Date("2026-10-04T00:00:00Z");
      const result = formatTime(date);
      expect(result).toBe("21:00");
    });

    it("should throw Error for invalid date", () => {
      expect(() => formatTime("invalid")).toThrow(Error);
    });
  });
});
