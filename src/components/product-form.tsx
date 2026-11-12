"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import { formatCents } from "@/lib/money";
import type { ProductDetail } from "@/server/menu";

export function ProductForm({ product }: { product: ProductDetail }) {
  const { add } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const chosen = product.groups.flatMap((g) =>
    g.options
      .filter((o) => picked[g.id]?.includes(o.id))
      .map((o) => ({ ...o, groupName: g.name })),
  );
  const unit = product.priceCents + chosen.reduce((s, o) => s + o.priceCents, 0);
  const total = useMemo(() => unit * quantity, [unit, quantity]);

  function toggle(groupId: string, optionId: string, max: number) {
    setPicked((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId))
        return { ...prev, [groupId]: current.filter((i) => i !== optionId) };
      if (max === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= max) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
    setErrors((e) => ({ ...e, [groupId]: "" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const g of product.groups) {
      const n = picked[g.id]?.length ?? 0;
      if (n < g.minSelect) next[g.id] = `Escolha ao menos ${g.minSelect}.`;
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    add({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePriceCents: product.priceCents,
      quantity,
      note: note.trim(),
      options: chosen.map((o) => ({
        id: o.id,
        groupName: o.groupName,
        name: o.name,
        priceCents: o.priceCents,
      })),
    });
    toast.success(`${product.name} adicionado ao carrinho.`);
    router.push("/");
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {product.groups.map((g) => (
        <fieldset key={g.id} className="space-y-2" aria-describedby={`err-${g.id}`}>
          <legend className="font-bold">
            {g.name}{" "}
            <span className="text-muted text-xs font-normal">
              {g.minSelect > 0 ? "Obrigatório" : "Opcional"}
              {g.maxSelect > 1 ? ` · até ${g.maxSelect}` : ""}
            </span>
          </legend>
          {g.options.map((o) => {
            const checked = picked[g.id]?.includes(o.id) ?? false;
            return (
              <label
                key={o.id}
                className={`flex min-h-11 items-center gap-3 rounded-lg border bg-white px-3 ${
                  checked ? "border-terracotta" : "border-sand"
                } ${o.available ? "cursor-pointer" : "opacity-50"}`}
              >
                <input
                  type={g.maxSelect === 1 ? "radio" : "checkbox"}
                  name={g.id}
                  checked={checked}
                  disabled={!o.available}
                  onChange={() => toggle(g.id, o.id, g.maxSelect)}
                  className="accent-terracotta size-4"
                />
                <span className="flex-1 text-sm">
                  {o.name}
                  {!o.available && " (indisponível)"}
                </span>
                {o.priceCents > 0 && (
                  <span className="text-muted text-sm">
                    + {formatCents(o.priceCents)}
                  </span>
                )}
              </label>
            );
          })}
          <p id={`err-${g.id}`} role="alert" className="field-error">
            {errors[g.id]}
          </p>
        </fieldset>
      ))}

      <div>
        <label htmlFor="note" className="label">
          Observações
        </label>
        <textarea
          id="note"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: sem cebola"
          className="input min-h-20 py-2"
        />
      </div>

      <div className="border-sand bg-cream sticky bottom-0 -mx-4 flex items-center gap-3 border-t px-4 py-3">
        <div className="border-sand flex items-center rounded-lg border bg-white">
          <button
            type="button"
            className="btn size-11"
            aria-label="Diminuir quantidade"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="btn size-11"
            aria-label="Aumentar quantidade"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={!product.available}
        >
          {product.available ? `Adicionar · ${formatCents(total)}` : "Indisponível"}
        </button>
      </div>
    </form>
  );
}
