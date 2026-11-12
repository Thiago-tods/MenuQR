"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

export function SiteHeader({ name }: { name: string }) {
  const { count, ready } = useCart();
  return (
    <header className="border-sand bg-cream/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
          {name}
        </Link>
        <Link
          href="/carrinho"
          className="btn-secondary relative"
          aria-label={`Carrinho${ready && count ? `, ${count} itens` : ""}`}
        >
          <ShoppingBag aria-hidden className="size-4" />
          <span className="hidden sm:inline">Carrinho</span>
          {ready && count > 0 && (
            <span className="bg-terracotta-ink rounded-full px-2 text-xs text-white">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
