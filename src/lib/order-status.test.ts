import { describe, expect, it } from "vitest";
import { canTransition, nextStatuses, ORDER_STATUSES } from "./order-status";

describe("máquina de estados", () => {
  it("permite o fluxo normal", () => {
    expect(canTransition("RECEIVED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PREPARING")).toBe(true);
    expect(canTransition("PREPARING", "READY")).toBe(true);
    expect(canTransition("READY", "COMPLETED")).toBe(true);
  });

  it("bloqueia pular etapas", () => {
    expect(canTransition("RECEIVED", "COMPLETED")).toBe(false);
    expect(canTransition("RECEIVED", "READY")).toBe(false);
  });

  it("estados finais não avançam nem voltam", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("COMPLETED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
    }
    expect(nextStatuses("COMPLETED")).toEqual([]);
  });

  it("permite cancelar antes de concluir", () => {
    for (const from of ["RECEIVED", "CONFIRMED", "PREPARING", "READY"] as const) {
      expect(canTransition(from, "CANCELLED")).toBe(true);
    }
  });
});
