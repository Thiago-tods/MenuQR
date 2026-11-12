import { startOfTodaySaoPaulo } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { requireAdmin } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const today = startOfTodaySaoPaulo().toISOString();

  const [orders, items] = await Promise.all([
    supabase.from("orders").select("status, total, created_at"),
    supabase
      .from("order_items")
      .select("product_name, quantity, orders!inner ( status )")
      .neq("orders.status", "CANCELLED"),
  ]);

  const rows = orders.data ?? [];
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const r of rows) byStatus[r.status as OrderStatus]++;
  const inProgress =
    byStatus.RECEIVED + byStatus.CONFIRMED + byStatus.PREPARING + byStatus.READY;
  const receivedToday = rows.filter((r) => r.created_at >= today).length;
  const registered = rows
    .filter((r) => r.status !== "CANCELLED")
    .reduce((sum, r) => sum + toCents(r.total), 0);

  const counts = new Map<string, number>();
  for (const i of items.data ?? [])
    counts.set(i.product_name, (counts.get(i.product_name) ?? 0) + i.quantity);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...ORDER_STATUSES.map((s) => byStatus[s]));

  const stats: [string, string][] = [
    ["Recebidos hoje", String(receivedToday)],
    ["Em andamento", String(inProgress)],
    ["Concluídos", String(byStatus.COMPLETED)],
    ["Total de pedidos", String(rows.length)],
    ["Valor dos pedidos registrados", formatCents(registered)],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="border-terracotta border-l-2 pl-3">
            <dt className="text-muted text-xs">{label}</dt>
            <dd className="text-2xl font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted -mt-4 text-xs">
        Indicadores operacionais dos pedidos registrados (exceto cancelados no valor). Não
        representam faturamento contábil.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="by-status">
          <h2 id="by-status" className="mb-3 font-bold">
            Pedidos por status
          </h2>
          <ul className="space-y-2">
            {ORDER_STATUSES.map((s) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="w-24">{STATUS_LABEL[s]}</span>
                <div className="bg-sand h-3 flex-1 rounded">
                  <div
                    className={`h-3 rounded ${s === "CANCELLED" ? "bg-muted" : "bg-olive"}`}
                    style={{ width: `${(byStatus[s] / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-semibold">{byStatus[s]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="top">
          <h2 id="top" className="mb-3 font-bold">
            Produtos mais pedidos
          </h2>
          {top.length === 0 ? (
            <p className="text-muted text-sm">Ainda não há pedidos.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {top.map(([name, qty], idx) => (
                <li key={name} className="border-sand flex justify-between border-b pb-2">
                  <span>
                    {idx + 1}. {name}
                  </span>
                  <span className="font-semibold">{qty} un.</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
