"use client";

import { useEffect, useState } from "react";
import { Check, Circle, XCircle } from "lucide-react";
import { formatCents } from "@/lib/money";
import { STATUS_LABEL, TIMELINE, type OrderStatus } from "@/lib/order-status";
import type { TrackedOrder } from "@/server/tracking";

const POLL_MS = 5000;
const FINAL: OrderStatus[] = ["COMPLETED", "CANCELLED"];
const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function OrderTracker({
  token,
  initial,
}: {
  token: string;
  initial: TrackedOrder;
}) {
  const [order, setOrder] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (FINAL.includes(order.status)) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/pedido/${token}`, { cache: "no-store" });
        if (res.ok) {
          setOrder(await res.json());
          setStale(false);
        } else setStale(true);
      } catch {
        setStale(true);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [token, order.status]);

  const cancelled = order.status === "CANCELLED";
  const currentIndex = TIMELINE.indexOf(order.status);
  const at = (s: OrderStatus) => order.history.find((h) => h.status === s)?.at;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-muted text-sm">Pedido</p>
        <h1 className="text-3xl font-extrabold">#{order.number}</h1>
        <p className="text-muted text-sm">
          {fmt.format(new Date(order.createdAt))} ·{" "}
          {order.mode === "DINE_IN"
            ? `Consumo no local${order.tableName ? ` · ${order.tableName}` : ""}`
            : "Retirada"}
        </p>
      </header>

      <section
        aria-label="Andamento"
        aria-live="polite"
        className="border-sand rounded-xl border bg-white p-4"
      >
        <p className="mb-3 font-bold">{STATUS_LABEL[order.status]}</p>
        {cancelled ? (
          <p className="flex items-center gap-2 text-red-700">
            <XCircle aria-hidden className="size-5" /> Este pedido foi cancelado.
          </p>
        ) : (
          <ol className="space-y-3">
            {TIMELINE.map((s, idx) => {
              const done = idx <= currentIndex;
              const time = at(s);
              return (
                <li
                  key={s}
                  className={`flex items-center gap-3 ${done ? "" : "text-muted"}`}
                >
                  {done ? (
                    <Check
                      aria-hidden
                      className="bg-olive size-5 rounded-full p-0.5 text-white"
                    />
                  ) : (
                    <Circle aria-hidden className="size-5" />
                  )}
                  <span className={idx === currentIndex ? "font-bold" : ""}>
                    {STATUS_LABEL[s]}
                  </span>
                  {time && (
                    <span className="ml-auto text-xs">
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(time))}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {stale && (
          <p className="text-muted mt-3 text-xs">Sem conexão. Tentando atualizar…</p>
        )}
      </section>

      <section aria-label="Itens" className="border-sand rounded-xl border bg-white p-4">
        <ul className="space-y-2 text-sm">
          {order.items.map((i, idx) => (
            <li key={idx}>
              <div className="flex justify-between gap-3">
                <span>
                  {i.quantity}× {i.name}
                </span>
                <span>{formatCents(i.unitPriceCents * i.quantity)}</span>
              </div>
              {i.options.length > 0 && (
                <p className="text-muted text-xs">{i.options.join(", ")}</p>
              )}
              {i.note && <p className="text-muted text-xs italic">“{i.note}”</p>}
            </li>
          ))}
        </ul>
        <p className="border-sand mt-3 flex justify-between border-t pt-3 font-extrabold">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </p>
        <p className="text-muted mt-1 text-xs">
          Pagamento no restaurante (não integrado nesta demonstração).
        </p>
      </section>
    </div>
  );
}
