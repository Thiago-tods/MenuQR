import { describe, expect, it } from "vitest";
import { getClientIp, normalizeIp, proxyModeFromEnv, UNKNOWN_IP } from "./client-ip";

const h = (o: Record<string, string>) => ({
  get: (name: string) => o[name.toLowerCase()] ?? null,
});

describe("proxyModeFromEnv", () => {
  it("reconhece só valores conhecidos", () => {
    expect(proxyModeFromEnv("vercel")).toBe("vercel");
    expect(proxyModeFromEnv(" Cloudflare ")).toBe("cloudflare");
    expect(proxyModeFromEnv(undefined)).toBe("none");
    expect(proxyModeFromEnv("true")).toBe("none");
    expect(proxyModeFromEnv("*")).toBe("none");
  });
});

describe("getClientIp sem proxy confiável", () => {
  it("ignora qualquer cabeçalho enviado pelo cliente", () => {
    const spoof = h({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
      "cf-connecting-ip": "9.9.9.9",
    });
    expect(getClientIp(spoof, "none")).toBe(UNKNOWN_IP);
  });
});

describe("getClientIp na Vercel", () => {
  it("usa x-real-ip definido pela plataforma", () => {
    expect(getClientIp(h({ "x-real-ip": "203.0.113.7" }), "vercel")).toBe("203.0.113.7");
  });

  it("cai para x-vercel-forwarded-for e depois x-forwarded-for", () => {
    expect(getClientIp(h({ "x-vercel-forwarded-for": "198.51.100.2" }), "vercel")).toBe(
      "198.51.100.2",
    );
    expect(
      getClientIp(h({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }), "vercel"),
    ).toBe("198.51.100.9");
  });

  it("não aceita lixo como IP", () => {
    for (const bad of [
      "not-an-ip",
      "999.1.1.1",
      "<script>",
      "1.2.3.4:80",
      "",
      "a".repeat(500),
    ]) {
      expect(getClientIp(h({ "x-real-ip": bad }), "vercel")).toBe(UNKNOWN_IP);
    }
  });

  it("ignora cf-connecting-ip fora do modo cloudflare", () => {
    expect(getClientIp(h({ "cf-connecting-ip": "203.0.113.50" }), "vercel")).toBe(
      UNKNOWN_IP,
    );
  });
});

describe("getClientIp na Cloudflare", () => {
  it("usa cf-connecting-ip e ignora x-forwarded-for", () => {
    const headers = h({
      "cf-connecting-ip": "203.0.113.50",
      "x-forwarded-for": "1.1.1.1",
    });
    expect(getClientIp(headers, "cloudflare")).toBe("203.0.113.50");
    expect(getClientIp(h({ "x-forwarded-for": "1.1.1.1" }), "cloudflare")).toBe(
      UNKNOWN_IP,
    );
  });
});

describe("normalizeIp", () => {
  it("mantém IPv4 e converte IPv4 mapeado em IPv6", () => {
    expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("reduz IPv6 ao prefixo /64, então trocar o sufixo não gera novo limite", () => {
    const a = normalizeIp("2001:db8:abcd:12::1");
    const b = normalizeIp("2001:db8:abcd:12:ffff:ffff:ffff:ffff");
    expect(a).toBe(b);
    expect(a).toBe("2001:db8:abcd:12::/64");
    expect(normalizeIp("2001:db8:abcd:13::1")).not.toBe(a);
  });

  it("trata :: no início e endereços curtos", () => {
    expect(normalizeIp("::1")).toBe("0:0:0:0::/64");
    expect(normalizeIp("2001:db8::")).toBe("2001:db8:0:0::/64");
  });
});
