import { describe, expect, it } from "vitest";
import { priceOrder, PricingError, type CatalogProduct } from "./pricing";

const burger: CatalogProduct = {
  id: "p1",
  name: "Burger Oliva",
  priceCents: 3500,
  available: true,
  groups: [
    {
      id: "g-ponto",
      name: "Ponto da carne",
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "o-mal", name: "Mal passado", priceCents: 0, available: true },
        { id: "o-ponto", name: "Ao ponto", priceCents: 0, available: true },
      ],
    },
    {
      id: "g-add",
      name: "Adicionais",
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: "o-bacon", name: "Bacon", priceCents: 600, available: true },
        { id: "o-ovo", name: "Ovo", priceCents: 350, available: true },
        { id: "o-queijo", name: "Queijo", priceCents: 500, available: false },
      ],
    },
  ],
};

const catalog = new Map([[burger.id, burger]]);
const line = (over: Partial<Parameters<typeof priceOrder>[0][number]> = {}) => ({
  productId: "p1",
  quantity: 1,
  optionIds: ["o-ponto"],
  ...over,
});

describe("priceOrder", () => {
  it("calcula subtotal, complementos e total", () => {
    const r = priceOrder(
      [line({ quantity: 2, optionIds: ["o-ponto", "o-bacon", "o-ovo"] })],
      catalog,
    );
    expect(r.lines[0].unitPriceCents).toBe(3500 + 600 + 350);
    expect(r.lines[0].lineTotalCents).toBe(4450 * 2);
    expect(r.subtotalCents).toBe(8900);
    expect(r.totalCents).toBe(8900);
  });

  it("soma várias linhas", () => {
    const r = priceOrder([line(), line({ optionIds: ["o-mal", "o-bacon"] })], catalog);
    expect(r.totalCents).toBe(3500 + 4100);
  });

  it("rejeita quantidade inválida", () => {
    for (const quantity of [0, -1, 1.5, 21]) {
      expect(() => priceOrder([line({ quantity })], catalog)).toThrow(PricingError);
    }
  });

  it("rejeita carrinho vazio e produto desconhecido", () => {
    expect(() => priceOrder([], catalog)).toThrow(PricingError);
    expect(() => priceOrder([line({ productId: "x" })], catalog)).toThrow(PricingError);
  });

  it("rejeita produto indisponível", () => {
    const off = new Map([["p1", { ...burger, available: false }]]);
    expect(() => priceOrder([line()], off)).toThrow(/indisponível/);
  });

  it("rejeita complemento indisponível, duplicado ou de outro produto", () => {
    expect(() =>
      priceOrder([line({ optionIds: ["o-ponto", "o-queijo"] })], catalog),
    ).toThrow(/indisponível/);
    expect(() =>
      priceOrder([line({ optionIds: ["o-ponto", "o-ponto"] })], catalog),
    ).toThrow(/duplicados/);
    expect(() =>
      priceOrder([line({ optionIds: ["o-ponto", "alheio"] })], catalog),
    ).toThrow(/inválido/);
  });

  it("aplica mínimo e máximo por grupo", () => {
    expect(() => priceOrder([line({ optionIds: [] })], catalog)).toThrow(/ao menos 1/);
    expect(() =>
      priceOrder([line({ optionIds: ["o-ponto", "o-mal"] })], catalog),
    ).toThrow(/no máximo 1/);
    expect(() =>
      priceOrder(
        [line({ optionIds: ["o-ponto", "o-bacon", "o-ovo", "o-queijo"] })],
        catalog,
      ),
    ).toThrow(PricingError);
  });

  it("ignora qualquer preço enviado pelo cliente", () => {
    const tampered = { ...line(), unitPriceCents: 1, priceCents: 1 } as never;
    expect(priceOrder([tampered], catalog).totalCents).toBe(3500);
  });
});
