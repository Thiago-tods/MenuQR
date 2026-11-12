import { describe, expect, it } from "vitest";
import {
  addItem,
  cartCount,
  cartSubtotal,
  parseStoredCart,
  removeItem,
  setQuantity,
  type CartItem,
} from "./cart";

const base = {
  productId: "p1",
  name: "Burger",
  imageUrl: null,
  basePriceCents: 3500,
  quantity: 1,
  note: "",
  options: [{ id: "o1", groupName: "Adicionais", name: "Bacon", priceCents: 600 }],
};

describe("carrinho", () => {
  it("soma complementos no subtotal", () => {
    const items = addItem([], base);
    expect(cartSubtotal(items)).toBe(4100);
  });

  it("agrupa linhas idênticas e separa variações", () => {
    let items = addItem([], base);
    items = addItem(items, base);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    items = addItem(items, { ...base, options: [] });
    expect(items).toHaveLength(2);
    expect(cartCount(items)).toBe(3);
  });

  it("limita a quantidade e remove ao zerar", () => {
    let items = addItem([], base);
    items = setQuantity(items, items[0].key, 99);
    expect(items[0].quantity).toBe(20);
    expect(setQuantity(items, items[0].key, 0)).toEqual([]);
    expect(removeItem(items, items[0].key)).toEqual([]);
  });

  it("sobrevive a serialização (persistência) e ignora lixo", () => {
    const items = addItem([], base);
    const restored = parseStoredCart(JSON.stringify(items));
    expect(restored).toEqual(items);
    expect(parseStoredCart("não é json")).toEqual([]);
    expect(
      parseStoredCart(JSON.stringify([{ foo: 1 }] as unknown as CartItem[])),
    ).toEqual([]);
    expect(parseStoredCart(null)).toEqual([]);
  });
});
