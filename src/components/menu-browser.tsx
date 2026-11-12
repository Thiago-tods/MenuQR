"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Clock } from "lucide-react";
import { FoodImage } from "@/components/food-image";
import { formatCents } from "@/lib/money";
import type { MenuCategory, MenuProduct } from "@/server/menu";

function ProductCard({ p }: { p: MenuProduct }) {
  return (
    <Link
      href={`/produto/${p.id}`}
      className={`group border-sand hover:border-terracotta/50 flex gap-3 rounded-xl border bg-white p-3 transition-colors ${
        p.available ? "" : "opacity-60"
      }`}
    >
      <FoodImage
        src={p.imageUrl}
        alt={p.name}
        className="size-24 shrink-0 rounded-lg sm:size-28"
        sizes="112px"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="leading-tight font-bold">{p.name}</h3>
        <p className="text-muted mt-1 line-clamp-2 text-sm">{p.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-terracotta-ink font-semibold">
            {formatCents(p.priceCents)}
          </span>
          {!p.available ? (
            <span className="text-muted text-xs font-medium">Indisponível</span>
          ) : p.prepMinutes ? (
            <span className="text-muted flex items-center gap-1 text-xs">
              <Clock aria-hidden className="size-3" />
              {p.prepMinutes} min
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function MenuBrowser({
  categories,
  products,
}: {
  categories: MenuCategory[];
  products: MenuProduct[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (!selected || p.categoryId === selected) &&
          (!q ||
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)),
      ),
    [products, selected, q],
  );
  const featured = products.filter((p) => p.featured && p.available);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          aria-hidden
          className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar no cardápio"
          aria-label="Buscar no cardápio"
          className="input pl-9"
        />
      </div>

      <nav aria-label="Categorias" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          {
            id: null,
            name: "Tudo",
            productCount: products.filter((p) => p.available).length,
          },
          ...categories.map((c) => ({
            id: c.id as string | null,
            name: c.name,
            productCount: c.productCount,
          })),
        ].map((c) => (
          <button
            key={c.id ?? "all"}
            type="button"
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
            className={`btn shrink-0 border ${
              selected === c.id
                ? "border-terracotta-ink bg-terracotta-ink text-white"
                : "border-sand hover:bg-sand/60 bg-white"
            }`}
          >
            {c.name}
            <span className={`text-xs ${selected === c.id ? "font-bold" : "text-muted"}`}>
              {c.productCount}
            </span>
          </button>
        ))}
      </nav>

      {!q && !selected && featured.length > 0 && (
        <section aria-labelledby="destaques">
          <h2 id="destaques" className="mb-3 text-xl font-extrabold">
            Destaques
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {categories
        .filter((c) => !selected || c.id === selected)
        .map((c) => {
          const list = filtered.filter((p) => p.categoryId === c.id);
          if (list.length === 0) return null;
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              <h2 id={`cat-${c.id}`} className="mb-3 text-xl font-extrabold">
                {c.name}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          );
        })}

      {filtered.length === 0 && (
        <p className="border-sand text-muted rounded-xl border border-dashed p-8 text-center">
          Nenhum item encontrado{q ? ` para “${query.trim()}”` : ""}.
        </p>
      )}
    </div>
  );
}
