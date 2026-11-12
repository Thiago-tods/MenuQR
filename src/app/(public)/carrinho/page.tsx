"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { lineTotal } from "@/lib/cart";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, ready, subtotalCents, setQty, remove } = useCart();

  if (!ready) return <div className="skeleton h-40" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <ShoppingBag aria-hidden className="text-muted mx-auto size-10" />
        <h1 className="text-xl font-extrabold">Seu carrinho está vazio</h1>
        <p className="text-muted">Escolha algo do cardápio para começar.</p>
        <Link href="/" className="btn-primary">
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Carrinho</h1>
      <ul className="divide-sand border-sand divide-y rounded-xl border bg-white">
        {items.map((i) => (
          <li key={i.key} className="space-y-2 p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">{i.name}</p>
                {i.options.length > 0 && (
                  <p className="text-muted text-sm">
                    {i.options.map((o) => o.name).join(", ")}
                  </p>
                )}
                {i.note && <p className="text-muted text-sm italic">“{i.note}”</p>}
              </div>
              <p className="font-semibold">{formatCents(lineTotal(i))}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="border-sand flex items-center rounded-lg border">
                <button
                  type="button"
                  className="btn size-11"
                  aria-label={`Diminuir ${i.name}`}
                  onClick={() => setQty(i.key, i.quantity - 1)}
                >
                  <Minus aria-hidden className="size-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {i.quantity}
                </span>
                <button
                  type="button"
                  className="btn size-11"
                  aria-label={`Aumentar ${i.name}`}
                  onClick={() => setQty(i.key, i.quantity + 1)}
                >
                  <Plus aria-hidden className="size-4" />
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary text-red-700"
                onClick={() => remove(i.key)}
              >
                <Trash2 aria-hidden className="size-4" /> Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-lg font-extrabold">
        <span>Total</span>
        <span>{formatCents(subtotalCents)}</span>
      </div>
      <p className="text-muted text-xs">
        Os valores são conferidos novamente ao finalizar o pedido.
      </p>
      <Link href="/checkout" className="btn-primary w-full">
        Continuar
      </Link>
    </div>
  );
}
