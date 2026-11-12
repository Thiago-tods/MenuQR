import { describe, expect, it } from "vitest";
import { isOpenNow, type OpeningHours } from "./hours";

// São Paulo é UTC-3 (sem horário de verão desde 2019).
const sp = (iso: string) => new Date(iso + "-03:00");
const hours: OpeningHours = {
  mon: { open: "11:00", close: "23:00" },
  fri: { open: "18:00", close: "02:00" },
  sat: null,
};

describe("isOpenNow", () => {
  it("aberto dentro do horário", () => {
    expect(isOpenNow(hours, sp("2026-11-09T12:00:00"))).toBe(true); // segunda
  });
  it("fechado fora do horário", () => {
    expect(isOpenNow(hours, sp("2026-11-09T10:59:00"))).toBe(false);
    expect(isOpenNow(hours, sp("2026-11-09T23:00:00"))).toBe(false);
  });
  it("fechado em dia sem horário", () => {
    expect(isOpenNow(hours, sp("2026-11-10T12:00:00"))).toBe(false); // terça
  });
  it("horário que passa da meia-noite", () => {
    expect(isOpenNow(hours, sp("2026-11-13T23:30:00"))).toBe(true); // sexta
    expect(isOpenNow(hours, sp("2026-11-14T01:00:00"))).toBe(true); // sábado cedo
    expect(isOpenNow(hours, sp("2026-11-14T02:00:00"))).toBe(false);
  });
});
