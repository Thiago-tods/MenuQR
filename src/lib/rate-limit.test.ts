import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("permite até o limite e bloqueia o excedente", () => {
    const key = "t:limite";
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000, 1000 + i)).toBe(true);
    expect(rateLimit(key, 3, 1000, 1010)).toBe(false);
  });

  it("libera de novo quando a janela passa", () => {
    const key = "t:janela";
    expect(rateLimit(key, 1, 1000, 0)).toBe(true);
    expect(rateLimit(key, 1, 1000, 500)).toBe(false);
    expect(rateLimit(key, 1, 1000, 1001)).toBe(true);
  });

  it("isola chaves diferentes", () => {
    expect(rateLimit("t:a", 1, 1000, 0)).toBe(true);
    expect(rateLimit("t:a", 1, 1000, 1)).toBe(false);
    expect(rateLimit("t:b", 1, 1000, 1)).toBe(true);
  });

  it("tentativas bloqueadas não estendem o bloqueio", () => {
    const key = "t:sem-extensao";
    expect(rateLimit(key, 1, 1000, 0)).toBe(true);
    for (let t = 100; t < 900; t += 100) expect(rateLimit(key, 1, 1000, t)).toBe(false);
    expect(rateLimit(key, 1, 1000, 1001)).toBe(true);
  });
});
