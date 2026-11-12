import { adminErrorMessage } from "@/lib/admin-errors";
import { requireAdmin } from "@/server/admin-auth";
import { saveTable, toggleTable } from "../catalog-actions";
import { PrintButton, QrCard } from "./qr-card";

export const dynamic = "force-dynamic";

export default async function QrCodePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const { data } = await supabase
    .from("tables")
    .select("id, name, public_code, active")
    .order("name");
  const tables = data ?? [];

  if (!base) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
        Defina NEXT_PUBLIC_SITE_URL no ambiente para gerar QR Codes.
      </p>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-extrabold">QR Codes</h1>
        <PrintButton />
      </div>
      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}

      <form
        action={saveTable}
        className="border-sand flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 print:hidden"
      >
        <div className="min-w-48 flex-1">
          <label htmlFor="table-name" className="label">
            Nova mesa
          </label>
          <input
            id="table-name"
            name="name"
            required
            maxLength={30}
            placeholder="Ex.: Mesa 7"
            className="input"
          />
        </div>
        <button className="btn-primary" type="submit">
          Adicionar mesa
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QrCard title="Cardápio" url={`${base}/`} filename="menuqr-cardapio" />
        {tables
          .filter((t) => t.active)
          .map((t) => (
            <QrCard
              key={t.id}
              title={t.name}
              url={`${base}/?mesa=${t.public_code}`}
              filename={`menuqr-${t.name.toLowerCase().replace(/\s+/g, "-")}`}
            />
          ))}
      </div>

      <section aria-labelledby="mesas" className="print:hidden">
        <h2 id="mesas" className="mb-2 font-bold">
          Mesas
        </h2>
        <ul className="space-y-2">
          {tables.map((t) => (
            <li
              key={t.id}
              className="border-sand flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm"
            >
              <span>
                {t.name} · {t.active ? "ativa" : "desativada"}
              </span>
              <form action={toggleTable}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="active" value={String(t.active)} />
                <button className="btn-secondary" type="submit">
                  {t.active ? "Desativar" : "Ativar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
