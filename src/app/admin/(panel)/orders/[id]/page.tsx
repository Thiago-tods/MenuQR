import { adminErrorMessage } from "@/lib/admin-errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { formatDateTime } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import { nextStatuses, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { requireAdmin } from "@/server/admin-auth";
import { updateOrderStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { id } = await params;
  const erro = adminErrorMessage((await searchParams).erro);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("orders")
    .select(
      `id, number, status, mode, notes, total, customer_name, customer_phone, created_at, payment_status, tables ( name ),
       order_items ( product_name, unit_price, quantity, note, order_item_complements ( group_name, name, price ) ),
       order_status_history ( to_status, created_at )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const o = data as unknown as {
    id: string;
    number: number;
    status: OrderStatus;
    mode: string;
    notes: string | null;
    total: string;
    customer_name: string;
    customer_phone: string;
    created_at: string;
    tables: { name: string } | null;
    order_items: {
      product_name: string;
      unit_price: string;
      quantity: number;
      note: string | null;
      order_item_complements: { group_name: string; name: string; price: string }[];
    }[];
    order_status_history: { to_status: OrderStatus; created_at: string }[];
  };
  const history = [...o.order_status_history].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/orders" className="text-muted text-sm underline">
        ← Pedidos
      </Link>
      <header>
        <h1 className="text-2xl font-extrabold">Pedido #{o.number}</h1>
        <p className="text-muted text-sm">
          {o.customer_name} · {o.customer_phone} · {formatDateTime(o.created_at)} ·{" "}
          {o.mode === "DINE_IN"
            ? `Consumo no local (${o.tables?.name ?? "mesa removida"})`
            : "Retirada"}
        </p>
        <p className="mt-2 font-bold">Status: {STATUS_LABEL[o.status]}</p>
      </header>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}

      <section aria-label="Atualizar status" className="flex flex-wrap gap-2">
        {nextStatuses(o.status).length === 0 && (
          <p className="text-muted text-sm">Pedido finalizado.</p>
        )}
        {nextStatuses(o.status).map((to) => (
          <form key={to} action={updateOrderStatus}>
            <input type="hidden" name="orderId" value={o.id} />
            <input type="hidden" name="to" value={to} />
            {to === "CANCELLED" ? (
              <ConfirmButton
                className="btn-danger"
                message={`Cancelar o pedido #${o.number}? Não é possível reabri-lo.`}
              >
                Cancelar pedido
              </ConfirmButton>
            ) : (
              <button type="submit" className="btn-primary">
                Marcar como {STATUS_LABEL[to].toLowerCase()}
              </button>
            )}
          </form>
        ))}
      </section>

      <section className="border-sand rounded-xl border bg-white p-4">
        <ul className="space-y-3 text-sm">
          {o.order_items.map((i, idx) => (
            <li key={idx}>
              <p className="flex justify-between font-medium">
                <span>
                  {i.quantity}× {i.product_name}
                </span>
                <span>{formatCents(toCents(i.unit_price) * i.quantity)}</span>
              </p>
              {i.order_item_complements.map((c, k) => (
                <p key={k} className="text-muted text-xs">
                  {c.group_name}: {c.name}
                  {toCents(c.price) > 0 ? ` (+${formatCents(toCents(c.price))})` : ""}
                </p>
              ))}
              {i.note && <p className="text-xs italic">“{i.note}”</p>}
            </li>
          ))}
        </ul>
        {o.notes && <p className="bg-cream mt-3 rounded p-2 text-sm">Obs.: {o.notes}</p>}
        <p className="border-sand mt-3 flex justify-between border-t pt-3 font-extrabold">
          <span>Total</span>
          <span>{formatCents(toCents(o.total))}</span>
        </p>
        <p className="text-muted text-xs">
          Pagamento: não integrado (pago no restaurante).
        </p>
      </section>

      <section aria-labelledby="hist">
        <h2 id="hist" className="mb-2 font-bold">
          Histórico
        </h2>
        <ol className="space-y-1 text-sm">
          {history.map((h, idx) => (
            <li key={idx}>
              {formatDateTime(h.created_at)} · {STATUS_LABEL[h.to_status]}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
