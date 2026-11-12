import { describe, expect, it } from "vitest";
import {
  ADMIN_ERRORS,
  adminErrorMessage,
  errorUrl,
  GENERIC_ADMIN_ERROR,
  type AdminErrorCode,
} from "./admin-errors";

describe("adminErrorMessage", () => {
  it("não mostra nada sem erro", () => {
    expect(adminErrorMessage(undefined)).toBeNull();
    expect(adminErrorMessage("")).toBeNull();
  });

  it("traduz todos os códigos conhecidos para o texto fixo", () => {
    for (const code of Object.keys(ADMIN_ERRORS) as AdminErrorCode[]) {
      expect(adminErrorMessage(code)).toBe(ADMIN_ERRORS[code]);
    }
  });

  it("usa a mensagem genérica para valores desconhecidos", () => {
    for (const v of [
      "qualquer-coisa",
      "ACESSO-NEGADO",
      " acesso-negado",
      "acesso-negado ",
    ]) {
      expect(adminErrorMessage(v)).toBe(GENERIC_ADMIN_ERROR);
    }
  });

  it("não devolve texto HTML nem tentativas de injeção", () => {
    const attacks = [
      "<script>alert(1)</script>",
      '<img src=x onerror="alert(1)">',
      '"><svg onload=alert(1)>',
      "javascript:alert(1)",
      "{{7*7}}",
      "${process.env.SUPABASE_SERVICE_ROLE_KEY}",
      "%3Cscript%3Ealert(1)%3C/script%3E",
      "Seu acesso foi bloqueado. Ligue para 0800-000-000.",
      "a".repeat(10_000),
    ];
    for (const attack of attacks) {
      const out = adminErrorMessage(attack);
      expect(out).toBe(GENERIC_ADMIN_ERROR);
      expect(out).not.toContain(attack.slice(0, 20));
    }
  });

  it("não confunde chaves herdadas do Object com códigos", () => {
    for (const v of [
      "__proto__",
      "constructor",
      "toString",
      "hasOwnProperty",
      "valueOf",
    ]) {
      expect(adminErrorMessage(v)).toBe(GENERIC_ADMIN_ERROR);
    }
  });

  it("aceita parâmetro repetido usando só o primeiro valor", () => {
    expect(adminErrorMessage(["pedido-mudou", "<b>x</b>"])).toBe(
      ADMIN_ERRORS["pedido-mudou"],
    );
    expect(adminErrorMessage(["<b>x</b>", "pedido-mudou"])).toBe(GENERIC_ADMIN_ERROR);
    expect(adminErrorMessage([])).toBeNull();
  });

  it("as mensagens fixas não contêm HTML", () => {
    for (const text of Object.values(ADMIN_ERRORS)) expect(text).not.toMatch(/[<>]/);
  });
});

describe("errorUrl", () => {
  it("monta a URL só com o código", () => {
    expect(errorUrl("/admin/products", "imagem-invalida")).toBe(
      "/admin/products?erro=imagem-invalida",
    );
    expect(errorUrl("/admin/products")).toBe("/admin/products");
  });
});
