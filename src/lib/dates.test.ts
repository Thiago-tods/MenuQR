import { describe, expect, it } from "vitest";
import { startOfTodaySaoPaulo } from "./dates";

describe("startOfTodaySaoPaulo", () => {
  it("usa o dia de São Paulo, não o UTC", () => {
    // 01:00 UTC de 12/11 ainda é 22:00 de 11/11 em São Paulo.
    expect(startOfTodaySaoPaulo(new Date("2026-11-12T01:00:00Z")).toISOString()).toBe(
      "2026-11-11T03:00:00.000Z",
    );
    expect(startOfTodaySaoPaulo(new Date("2026-11-12T12:00:00Z")).toISOString()).toBe(
      "2026-11-12T03:00:00.000Z",
    );
  });
});
