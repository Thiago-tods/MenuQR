import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import { isOrderStatus, ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { requireAdmin } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { status, q } = await searchParams;

  let query = supabase
    .from("orders")
    .select("id, number, status, mode, total, customer_name, created_at, tables ( name )")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && isOrderStatus(status)) query = query.eq("status", status);
  const number = Number(q?.replace(/\D/g, ""));
  if (q && Number.isSafeInteger(number) && number > 0) query = query.eq("number", number);

  const { data } = await query;
  const orders = (data ?? []) as unknown as {
    id: string;
    number: number;
    status: keyof typeof STATUS_LABEL;
    mode: string;
    total: string;
    customer_name: string;
    created_at: string;
    tables: { name: string } | null;
  }[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Pedidos</h1>
      <form className="flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Nº do pedido"
          aria-label="Número do pedido"
          className="input max-w-40"
          inputMode="numeric"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Status"
          className="input max-w-48"
        >
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">
          Filtrar
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="border-sand text-muted rounded-xl border border-dashed p-8 text-center">
          Nenhum pedido encontrado.
        </p>
      ) : (
        <div className="border-sand overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-sand text-muted border-b text-xs">
              <tr>
                <th className="p-3">Nº</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total</th>
                <th className="p-3">Criado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-sand hover:bg-cream border-b last:border-0"
                >
                  <td className="p-3 font-bold">
                    <Link
                      className="inline-flex min-h-10 items-center px-1 underline"
                      href={`/admin/orders/${o.id}`}
                    >
                      #{o.number}
                    </Link>
                  </td>
                  <td className="p-3">{o.customer_name}</td>
                  <td className="p-3">
                    {o.mode === "DINE_IN" ? (o.tables?.name ?? "Local") : "Retirada"}
                  </td>
                  <td className="p-3">{STATUS_LABEL[o.status]}</td>
                  <td className="p-3">{formatCents(toCents(o.total))}</td>
                  <td className="p-3">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
