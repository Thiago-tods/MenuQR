/** Lógica pura do carrinho (testável). Os preços aqui servem só para exibição. */

export type CartOption = {
  id: string;
  groupName: string;
  name: string;
  priceCents: number;
};

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  basePriceCents: number;
  quantity: number;
  note: string;
  options: CartOption[];
};

export const CART_STORAGE_KEY = "menuqr.cart.v1";

export function lineKey(productId: string, optionIds: string[], note: string): string {
  return [productId, [...optionIds].sort().join(","), note.trim().toLowerCase()].join(
    "|",
  );
}

export function unitPrice(item: CartItem): number {
  return item.basePriceCents + item.options.reduce((s, o) => s + o.priceCents, 0);
}

export function lineTotal(item: CartItem): number {
  return unitPrice(item) * item.quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + lineTotal(i), 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

export function addItem(items: CartItem[], item: Omit<CartItem, "key">): CartItem[] {
  const key = lineKey(
    item.productId,
    item.options.map((o) => o.id),
    item.note,
  );
  const existing = items.find((i) => i.key === key);
  if (existing) {
    return items.map((i) =>
      i.key === key ? { ...i, quantity: Math.min(20, i.quantity + item.quantity) } : i,
    );
  }
  return [...items, { ...item, key, quantity: Math.min(20, item.quantity) }];
}

export function setQuantity(
  items: CartItem[],
  key: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return items.filter((i) => i.key !== key);
  return items.map((i) =>
    i.key === key ? { ...i, quantity: Math.min(20, quantity) } : i,
  );
}

export function removeItem(items: CartItem[], key: string): CartItem[] {
  return items.filter((i) => i.key !== key);
}

/** Leitura defensiva do que está no localStorage. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (i): i is CartItem =>
        !!i &&
        typeof i.key === "string" &&
        typeof i.productId === "string" &&
        Number.isInteger(i.quantity) &&
        i.quantity >= 1 &&
        Number.isInteger(i.basePriceCents) &&
        Array.isArray(i.options),
    );
  } catch {
    return [];
  }
}
