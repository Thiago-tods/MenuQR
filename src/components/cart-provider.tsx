"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  addItem,
  CART_STORAGE_KEY,
  cartCount,
  cartSubtotal,
  parseStoredCart,
  removeItem,
  setQuantity,
  type CartItem,
} from "@/lib/cart";
import { createStorageStore } from "@/lib/storage-store";

const EMPTY: CartItem[] = [];
const store = createStorageStore(
  () => localStorage,
  CART_STORAGE_KEY,
  parseStoredCart,
  EMPTY,
);

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotalCents: number;
  add: (item: Omit<CartItem, "key">) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  // false no servidor e na hidratação; true depois, evitando divergência de HTML.
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const update = useCallback(
    (fn: (current: CartItem[]) => CartItem[]) => store.write(fn(store.getSnapshot())),
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: cartCount(items),
      subtotalCents: cartSubtotal(items),
      add: (item) => update((c) => addItem(c, item)),
      setQty: (key, q) => update((c) => setQuantity(c, key, q)),
      remove: (key) => update((c) => removeItem(c, key)),
      clear: () => store.write(EMPTY),
    }),
    [items, ready, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
